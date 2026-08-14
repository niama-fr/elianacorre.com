import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

// CONSTS -----------------------------------------------------------------------------------------------------------------------------------

const DEPLOYMENT = "dev" as const;
const BACKEND_DIR = resolve(import.meta.dir, "..");

const CONVEX_TRANSIENT_OUTPUT = /^Attempting reconnect in \d+ms$/u;
const CONVEX_TABLE_NAME = /^[A-Za-z0-9][A-Za-z0-9_]*$/u;

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

type StorageBatchResult = {
  deleted: number;
  done: boolean;
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
  const child = Bun.spawn(command, {
    cwd,
    env: {
      ...process.env,
      NO_COLOR: "1",
    },
    stderr: "pipe",
    stdout: "pipe",
  });

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);

  if (exitCode !== 0 && !allowFailure)
    throw new Error([`Command failed: ${command.join(" ")}`, stdout.trim(), stderr.trim()].filter(Boolean).join("\n"));

  return {
    exitCode,
    stderr,
    stdout,
  };
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

function parseJson<T>(stdout: string): T {
  const text = cleanConvexStdout(stdout).trim();

  if (!text) throw new Error("Convex returned an empty response");

  const lines = text.split(/\r?\n/u);

  for (let start = 0; start < lines.length; start++) {
    const firstLine = lines[start]?.trimStart();

    if (firstLine === undefined || (!firstLine.startsWith("{") && !firstLine.startsWith("["))) continue;

    for (let end = lines.length; end > start; end--) {
      const candidate = lines.slice(start, end).join("\n").trim();

      try {
        return JSON.parse(candidate) as T;
      } catch {
        // Continue looking for the JSON payload.
      }
    }
  }

  throw new Error(`Could not parse Convex output as JSON:\n${text}`);
}

function parseJsonArray<T>(stdout: string): T[] {
  const text = cleanConvexStdout(stdout).trim();

  if (!text) return [];

  const parsed = parseJson<unknown>(text);

  if (!Array.isArray(parsed)) throw new Error(`Expected Convex to return a JSON array:\n${text}`);

  return parsed as T[];
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

  return parseJsonArray<unknown>(stdout);
}

// PREFLIGHT --------------------------------------------------------------------------------------------------------------------------------

async function assertZipAvailable(): Promise<void> {
  const result = await runCommand(["zip", "-v"], {
    allowFailure: true,
  });

  if (result.exitCode !== 0) throw new Error('The "zip" command is required by the Convex dev reset script.');
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

  const files = parseJsonArray<unknown>(result.stdout);

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

  const snapshotDirectory = join(temporaryDirectory, `snapshot-${index}`);

  await mkdir(snapshotDirectory, {
    recursive: true,
  });

  for (const table of plan.tables) {
    const tableDirectory = join(snapshotDirectory, table);

    await mkdir(tableDirectory, {
      recursive: true,
    });

    await writeFile(join(tableDirectory, "documents.jsonl"), "");
  }

  const snapshotPath = join(temporaryDirectory, `snapshot-${index}.zip`);

  await runCommand(["zip", "-q", "-r", snapshotPath, "."], {
    cwd: snapshotDirectory,
  });

  return snapshotPath;
}

// RESET ------------------------------------------------------------------------------------------------------------------------------------

async function prepareRuntime(): Promise<ResetPreparation> {
  const { stdout } = await runConvex(["run", "--deployment", DEPLOYMENT, "--push", "dev:prepareReset", "{}"]);

  return parseJson<ResetPreparation>(stdout);
}

async function deleteRootStorage(): Promise<number> {
  let deleted = 0;

  for (;;) {
    const { stdout } = await runConvex(["run", "--deployment", DEPLOYMENT, "dev:deleteStorageBatch", "{}"]);

    const result = parseJson<StorageBatchResult>(stdout);

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

// MAIN -------------------------------------------------------------------------------------------------------------------------------------

async function main() {
  console.log("Resetting Convex personal dev deployment...");
  console.log("Target: --deployment dev\n");

  await assertZipAvailable();

  /*
   * Every stateful component mounted by convex.config.ts, including nested
   * components, must be represented in SCOPES.
   *
   * We deliberately do not inspect each table for data. A reset wants every
   * table empty regardless, and individual remote inspections dominate the
   * execution time.
   */
  console.log("Preflight");

  const [plans, rootStorage] = await Promise.all([buildPlan(), listOneDocument("_storage")]);

  const tableCount = plans.reduce((total, plan) => total + plan.tables.length, 0);

  console.log(`✓ ${plans.length} database scope(s) discovered`);
  console.log(`✓ ${tableCount} table(s) discovered`);
  console.log(rootStorage.length > 0 ? "! application storage contains file(s)" : "- application storage empty");

  const temporaryDirectory = await mkdtemp(join(tmpdir(), "elianacorre-convex-reset-"));

  try {
    const snapshots = await Promise.all(
      plans.map(async (plan, index) => ({
        path: await createEmptySnapshot(temporaryDirectory, plan, index),
        plan,
      }))
    );

    console.log("\nReset");

    const preparation = await prepareRuntime();

    console.log(`✓ canceled ${preparation.canceledWorkflows} active workflow(s)`);
    console.log(`✓ canceled ${preparation.canceledScheduledFunctions} scheduled function(s)`);

    let clearedTables = 0;

    for (const snapshot of snapshots) {
      if (snapshot.path === null) {
        console.log(`- ${snapshot.plan.label}: no tables`);
        continue;
      }

      await clearScope(snapshot.path, snapshot.plan);

      clearedTables += snapshot.plan.tables.length;

      console.log(`✓ ${snapshot.plan.label}: ${snapshot.plan.tables.length} table(s) cleared`);
    }

    /*
     * Root file storage is deleted last so a failed table reset cannot leave
     * surviving application documents pointing at files already removed.
     */
    const deletedFiles = rootStorage.length > 0 ? await deleteRootStorage() : 0;

    console.log(`✓ ${deletedFiles} stored file(s) deleted`);

    console.log("\nSummary");
    console.log(`✓ ${clearedTables} table(s) cleared`);
    console.log(`✓ ${deletedFiles} stored file(s) deleted`);
    console.log(`✓ ${preparation.canceledWorkflows} active workflow(s) canceled`);
    console.log(`✓ ${preparation.canceledScheduledFunctions} scheduled function(s) canceled`);

    console.log("\n✓ Convex dev database reset complete.");
  } finally {
    await rm(temporaryDirectory, {
      force: true,
      recursive: true,
    });
  }
}

await main();
