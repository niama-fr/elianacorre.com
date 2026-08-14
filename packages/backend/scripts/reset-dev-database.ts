import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { styleText } from "node:util";

import { intro, log, note, outro, progress, spinner } from "@clack/prompts";
import { $ } from "bun";

// CONSTS -----------------------------------------------------------------------------------------------------------------------------------

const DEPLOYMENT = "dev" as const;
const BACKEND_DIR = path.resolve(import.meta.dir, "..");

const CONVEX_TRANSIENT_OUTPUT = /^Attempting reconnect in \d+ms$/u;
const CONVEX_TABLE_NAME = /^[A-Za-z0-9][A-Za-z0-9_]*$/u;
const DEFAULT_TERMINAL_COLUMNS = 80;
const DEFAULT_PROGRESS_SIZE = 40;
const PROGRESS_RESERVED_COLUMNS = 8;

const styleProgressFrame = (frame: string): string => styleText("magenta", frame);

const SCOPES = [
  {
    component: "workflow/workpool",
    label: "workflow/workpool",
    optional: true,
  },
  {
    component: "workflow",
    label: "workflow",
    optional: true,
  },
  {
    component: "rateLimiter",
    label: "rateLimiter",
    optional: true,
  },
  {
    component: "loops/contactAggregate",
    label: "loops/contactAggregate",
    optional: true,
  },
  {
    component: "loops",
    label: "loops",
    optional: false,
  },
  {
    component: "betterAuth",
    label: "betterAuth",
    optional: false,
  },
  {
    label: "application",
    optional: false,
  },
] as const;

// TYPES ------------------------------------------------------------------------------------------------------------------------------------

type CommandResult = {
  exitCode: number;
  stderr: string;
  stdout: string;
};

type ResetPreparation = {
  canceledScheduledFunctions: number;
  canceledWorkflows: number;
};

type ScopePlan = {
  component?: string;
  label: string;
  tables: string[];
};

// COMMANDS ---------------------------------------------------------------------------------------------------------------------------------

async function runCommand(
  command: readonly string[],
  {
    allowFailure = false,
    cwd = BACKEND_DIR,
  }: {
    allowFailure?: boolean;
    cwd?: string;
  } = {}
): Promise<CommandResult> {
  const output = await $`${[...command]}`
    .cwd(cwd)
    .env({
      ...process.env,
      NO_COLOR: "1",
    })
    .nothrow()
    .quiet();

  const result = {
    exitCode: output.exitCode,
    stderr: output.stderr.toString(),
    stdout: output.stdout.toString(),
  };

  if (result.exitCode !== 0 && !allowFailure)
    throw new Error([`Command failed: ${command.join(" ")}`, result.stdout.trim(), result.stderr.trim()].filter(Boolean).join("\n"));

  return result;
}

async function runConvex(
  args: readonly string[],
  options?: {
    allowFailure?: boolean;
  }
): Promise<CommandResult> {
  return await runCommand(["bunx", "convex", ...args], options);
}

// PARSE ------------------------------------------------------------------------------------------------------------------------------------

function cleanConvexStdout(stdout: string): string {
  return stdout
    .split(/\r?\n/u)
    .filter((line) => !CONVEX_TRANSIENT_OUTPUT.test(line.trim()))
    .join("\n");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseJson(stdout: string): unknown {
  const text = cleanConvexStdout(stdout).trim();

  if (!text) throw new Error("Convex returned an empty response");

  const lines = text.split(/\r?\n/u);

  for (let start = 0; start < lines.length; start += 1) {
    const firstLine = lines[start]?.trimStart();

    if (firstLine === undefined || (!firstLine.startsWith("{") && !firstLine.startsWith("["))) continue;

    for (let end = lines.length; end > start; end -= 1) {
      const candidate = lines.slice(start, end).join("\n").trim();

      try {
        return JSON.parse(candidate) as unknown;
      } catch {
        // Continue looking for the JSON payload.
      }
    }
  }

  throw new Error(`Could not parse Convex output as JSON:\n${text}`);
}

function parseJsonArray(stdout: string): unknown[] {
  const text = cleanConvexStdout(stdout).trim();

  if (!text) return [];

  const parsed = parseJson(text);

  if (!Array.isArray(parsed)) throw new Error(`Expected Convex to return a JSON array:\n${text}`);

  return parsed;
}

function parseTableNames(stdout: string): string[] {
  return [
    ...new Set(
      cleanConvexStdout(stdout)
        .split(/\r?\n/u)
        .map((line) => line.trim())
        .filter((line) => CONVEX_TABLE_NAME.test(line))
    ),
  ];
}

function isMissingComponent(result: CommandResult): boolean {
  const output = `${result.stdout}\n${result.stderr}`;

  return (
    /component.*(?:not found|does not exist|unknown|invalid)/iu.test(output) ||
    /(?:not found|does not exist|unknown|invalid).*component/iu.test(output)
  );
}

// DATA -------------------------------------------------------------------------------------------------------------------------------------

async function listTables(component?: string, optional = false): Promise<string[] | null> {
  const args = ["data", "--deployment", DEPLOYMENT];

  if (component) args.push("--component", component);

  const result = await runConvex(args, {
    allowFailure: optional,
  });

  if (result.exitCode !== 0) {
    if (optional && isMissingComponent(result)) return null;

    throw new Error(
      [`Could not inspect ${component ?? "application"} tables.`, result.stdout.trim(), result.stderr.trim()].filter(Boolean).join("\n")
    );
  }

  return parseTableNames(result.stdout);
}

async function listOneDocument(table: string, component?: string): Promise<unknown[]> {
  const args = ["data", table, "--deployment", DEPLOYMENT, "--limit", "1", "--format", "json"];

  if (component) args.push("--component", component);

  const { stdout } = await runConvex(args);

  return parseJsonArray(stdout);
}

// PREFLIGHT --------------------------------------------------------------------------------------------------------------------------------

function assertZipAvailable(): void {
  if (Bun.which("zip") === null) throw new Error('The "zip" command is required by the Convex dev reset script.');
}

async function assertComponentHasNoStorage(component: string): Promise<void> {
  const args = ["data", "_storage", "--deployment", DEPLOYMENT, "--component", component, "--limit", "1", "--format", "json"];

  const result = await runConvex(args, {
    allowFailure: true,
  });

  if (result.exitCode !== 0) {
    if (isMissingComponent(result)) return;

    throw new Error(
      [`Could not inspect storage for component "${component}".`, result.stdout.trim(), result.stderr.trim()].filter(Boolean).join("\n")
    );
  }

  const files = parseJsonArray(result.stdout);

  if (files.length > 0)
    throw new Error(
      [
        `Component "${component}" contains file storage.`,
        "The reset refuses to start because component-owned files would survive.",
        "Add an explicit component storage reset before proceeding.",
      ].join("\n")
    );
}

async function buildPlan(): Promise<ScopePlan[]> {
  const plans = await Promise.all(
    SCOPES.map(async (scope): Promise<ScopePlan | null> => {
      const component = "component" in scope ? scope.component : undefined;

      const tables = await listTables(component, scope.optional);

      if (tables === null) return null;

      if (component) await assertComponentHasNoStorage(component);

      return {
        ...(component === undefined ? {} : { component }),
        label: scope.label,
        tables,
      };
    })
  );

  return plans.filter((plan): plan is ScopePlan => plan !== null);
}

// SNAPSHOT ---------------------------------------------------------------------------------------------------------------------------------

async function createEmptySnapshot(temporaryDirectory: string, plan: ScopePlan, index: number): Promise<string | null> {
  if (plan.tables.length === 0) return null;

  const snapshotDirectory = path.join(temporaryDirectory, `snapshot-${index}`);

  await mkdir(snapshotDirectory, {
    recursive: true,
  });

  for (const table of plan.tables) {
    const tableDirectory = path.join(snapshotDirectory, table);

    await mkdir(tableDirectory, {
      recursive: true,
    });

    await writeFile(path.join(tableDirectory, "documents.jsonl"), "");
  }

  const snapshotPath = path.join(temporaryDirectory, `snapshot-${index}.zip`);

  await runCommand(["zip", "-q", "-r", snapshotPath, "."], {
    cwd: snapshotDirectory,
  });

  return snapshotPath;
}

// RESET ------------------------------------------------------------------------------------------------------------------------------------

async function prepareRuntime(): Promise<ResetPreparation> {
  const { stdout } = await runConvex(["run", "--deployment", DEPLOYMENT, "--push", "dev:prepareReset", "{}"]);

  const result = parseJson(stdout);

  if (!isRecord(result) || typeof result.canceledScheduledFunctions !== "number" || typeof result.canceledWorkflows !== "number")
    throw new Error("Convex returned an invalid reset preparation payload");

  return {
    canceledScheduledFunctions: result.canceledScheduledFunctions,
    canceledWorkflows: result.canceledWorkflows,
  };
}

async function deleteRootStorage(): Promise<number> {
  let deleted = 0;

  for (;;) {
    const { stdout } = await runConvex(["run", "--deployment", DEPLOYMENT, "dev:deleteStorageBatch", "{}"]);

    const result = parseJson(stdout);

    if (!isRecord(result) || typeof result.deleted !== "number" || typeof result.done !== "boolean")
      throw new Error("Convex returned an invalid storage deletion payload");

    deleted += result.deleted;

    if (result.done) return deleted;
  }
}

async function clearScope(snapshotPath: string, plan: ScopePlan): Promise<void> {
  const args = ["import", "--deployment", DEPLOYMENT, "--replace", "--yes"];

  if (plan.component) args.push("--component", plan.component);

  args.push(snapshotPath);

  await runConvex(args);
}

// OUTPUT -----------------------------------------------------------------------------------------------------------------------------------

function getProgressSize(messages: readonly string[]): number {
  const terminalColumns = process.stdout.columns ?? DEFAULT_TERMINAL_COLUMNS;
  // oxlint-disable-next-line unicorn/no-array-reduce
  const longestMessageLength = messages.reduce((longest, message) => Math.max(longest, message.length), 0);

  return Math.max(1, Math.min(DEFAULT_PROGRESS_SIZE, terminalColumns - longestMessageLength - PROGRESS_RESERVED_COLUMNS));
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function runWithSpinner<T>({
  failureMessage,
  operation,
  startMessage,
  successMessage,
}: {
  failureMessage: string;
  operation: () => Promise<T>;
  startMessage: string;
  successMessage: (result: T) => string;
}): Promise<T> {
  const indicator = spinner({ styleFrame: styleProgressFrame });

  indicator.start(startMessage);

  try {
    const result = await operation();

    indicator.stop(successMessage(result));

    return result;
  } catch (error) {
    indicator.error(failureMessage);
    throw error;
  }
}

// MAIN -------------------------------------------------------------------------------------------------------------------------------------

async function main(): Promise<void> {
  intro("Reset Convex dev database");
  note("Deployment: personal dev (--deployment dev)\nMode: destructive and non-interactive", "Target");

  assertZipAvailable();

  /*
   * Every stateful component mounted by convex.config.ts, including nested
   * components, must be represented in SCOPES.
   *
   * We deliberately do not inspect each table for data. A reset wants every
   * table empty regardless, and individual remote inspections dominate the
   * execution time.
   */
  const [plans, rootStorage] = await runWithSpinner({
    failureMessage: "Preflight failed",
    operation: async () => await Promise.all([buildPlan(), listOneDocument("_storage")]),
    startMessage: "Inspecting configured database scopes",
    successMessage: ([resolvedPlans]) => {
      const tableCount = resolvedPlans.reduce((total, plan) => total + plan.tables.length, 0);

      return `Discovered ${resolvedPlans.length} database scope(s) and ${tableCount} table(s)`;
    },
  });

  if (rootStorage.length > 0) log.warn("Application storage contains file(s) that will be deleted last");
  else log.info("Application storage is already empty");

  const temporaryDirectory = await mkdtemp(path.join(tmpdir(), "elianacorre-convex-reset-"));

  try {
    const snapshots = await runWithSpinner({
      failureMessage: "Could not prepare empty snapshots",
      operation: async () =>
        await Promise.all(
          plans.map(async (plan, index) => ({
            path: await createEmptySnapshot(temporaryDirectory, plan, index),
            plan,
          }))
        ),
      startMessage: "Preparing empty Convex snapshots",
      successMessage: (resolvedSnapshots) => {
        const snapshotCount = resolvedSnapshots.filter((snapshot) => snapshot.path !== null).length;

        return `Prepared ${snapshotCount} empty snapshot(s)`;
      },
    });

    const preparation = await runWithSpinner({
      failureMessage: "Could not prepare the Convex runtime for reset",
      operation: prepareRuntime,
      startMessage: "Canceling active workflows and scheduled functions",
      successMessage: (result) =>
        `Canceled ${result.canceledWorkflows} workflow(s) and ${result.canceledScheduledFunctions} scheduled function(s)`,
    });

    const clearableSnapshots = snapshots.filter((snapshot): snapshot is { path: string; plan: ScopePlan } => snapshot.path !== null);
    const emptyScopes = snapshots.filter((snapshot) => snapshot.path === null);

    for (const snapshot of emptyScopes) log.info(`${snapshot.plan.label}: no tables to clear`);

    let clearedTables = 0;

    if (clearableSnapshots.length > 0) {
      const progressMessages = clearableSnapshots.map(
        (snapshot, index) => `[${index + 1}/${clearableSnapshots.length}] ${snapshot.plan.label}`
      );
      const scopeProgress = progress({
        max: clearableSnapshots.length,
        size: getProgressSize(progressMessages),
        styleFrame: styleProgressFrame,
      });

      scopeProgress.start(progressMessages[0]);

      try {
        for (const [index, snapshot] of clearableSnapshots.entries()) {
          const message = progressMessages[index];

          if (message === undefined) throw new Error("Missing database scope progress message");
          if (index > 0) scopeProgress.message(message);

          await clearScope(snapshot.path, snapshot.plan);

          clearedTables += snapshot.plan.tables.length;
          scopeProgress.advance();
        }

        scopeProgress.stop(`Cleared ${clearedTables} table(s) across ${clearableSnapshots.length} scope(s)`);
      } catch (error) {
        scopeProgress.error("Database scope reset failed");
        throw error;
      }
    } else log.info("No database tables require clearing");

    /*
     * Root file storage is deleted last so a failed table reset cannot leave
     * surviving application documents pointing at files already removed.
     */
    const deletedFiles =
      rootStorage.length > 0
        ? await runWithSpinner({
            failureMessage: "Could not delete application storage",
            operation: deleteRootStorage,
            startMessage: "Deleting application storage",
            successMessage: (count) => `Deleted ${count} stored file(s)`,
          })
        : 0;

    note(
      [
        `${clearedTables} table(s) cleared`,
        `${deletedFiles} stored file(s) deleted`,
        `${preparation.canceledWorkflows} active workflow(s) canceled`,
        `${preparation.canceledScheduledFunctions} scheduled function(s) canceled`,
      ].join("\n"),
      "Summary"
    );

    outro("Convex dev database reset complete");
  } finally {
    await rm(temporaryDirectory, {
      force: true,
      recursive: true,
    });
  }
}

try {
  await main();
} catch (error) {
  log.error(formatError(error));
  process.exitCode = 1;
}
