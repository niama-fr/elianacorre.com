import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps, JSX } from "solid-js";
import { createMemo, For, Show, splitProps } from "solid-js";
import { cn } from "@/lib/utils";
import { Label } from "@/raw/label";
import { Separator } from "@/raw/separator";

// ROOT ------------------------------------------------------------------------------------------------------------------------------------
export const fieldVariants = cva("group/field z-field flex w-full", {
  variants: {
    orientation: {
      vertical: "z-field-orientation-vertical flex-col *:w-full [&>.sr-only]:w-auto",
      horizontal:
        "z-field-orientation-horizontal flex-row items-center has-[>[data-slot=field-content]]:items-start *:data-[slot=field-label]:flex-auto has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px",
      responsive:
        "z-field-orientation-responsive @md/field-group:flex-row flex-col @md/field-group:items-center *:w-full @md/field-group:*:w-auto @md/field-group:has-[>[data-slot=field-content]]:items-start @md/field-group:*:data-[slot=field-label]:flex-auto [&>.sr-only]:w-auto @md/field-group:has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px",
    },
  },
  defaultVariants: {
    orientation: "vertical",
  },
});

export const Field = (props: FieldProps) => {
  const [local, others] = splitProps(props, ["class", "orientation"]);
  return (
    // biome-ignore lint/a11y/useSemanticElements: role="group" is intentional per shadcn design for accessibility
    <div
      class={cn(fieldVariants({ orientation: local.orientation }), local.class)}
      data-orientation={local.orientation ?? "vertical"}
      data-slot="field"
      role="group"
      {...others}
    />
  );
};
type FieldProps = ComponentProps<"div"> & VariantProps<typeof fieldVariants> & { class?: string | undefined };

// CONTENT ---------------------------------------------------------------------------------------------------------------------------------
export const FieldContent = (props: FieldContentProps) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <div
      class={cn("group/field-content z-field-content flex flex-1 flex-col leading-snug", local.class)}
      data-slot="field-content"
      {...others}
    />
  );
};
type FieldContentProps = ComponentProps<"div"> & { class?: string | undefined };

// DESCRIPTION -----------------------------------------------------------------------------------------------------------------------------
export const FieldDescription = (props: FieldDescriptionProps) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <p
      class={cn(
        "z-field-description font-normal leading-normal group-has-data-[orientation=horizontal]/field:text-balance",
        "nth-last-2:-mt-1 last:mt-0",
        "[&>a:hover]:text-primary [&>a]:underline [&>a]:underline-offset-4",
        local.class
      )}
      data-slot="field-description"
      {...others}
    />
  );
};
type FieldDescriptionProps = ComponentProps<"p"> & { class?: string | undefined };

// ERROR -----------------------------------------------------------------------------------------------------------------------------------
export const FieldError = (props: FieldErrorProps) => {
  const [_, others] = splitProps(props, ["class", "children", "errors"]);

  const content = createMemo(() => {
    if (_.children) return _.children;
    if (!_.errors?.length) return null;

    const uniqueErrors = [...new Map(_.errors.map((error) => [error?.message, error])).values()];

    if (uniqueErrors?.length === 1) return uniqueErrors[0]?.message;

    return (
      <ul class="ml-4 flex list-disc flex-col gap-1">
        <For each={uniqueErrors}>
          {(error) => (
            <Show when={error?.message}>
              <li>{error?.message}</li>
            </Show>
          )}
        </For>
      </ul>
    );
  });

  return (
    <Show when={content()}>
      <div class={cn("z-field-error font-normal", _.class)} data-slot="field-error" role="alert" {...others}>
        {content()}
      </div>
    </Show>
  );
};
type FieldErrorProps = ComponentProps<"div"> & {
  class?: string | undefined;
  children?: JSX.Element;
  errors?: Array<{ message?: string } | undefined>;
};

// GROUP -----------------------------------------------------------------------------------------------------------------------------------
export const FieldGroup = (props: FieldGroupProps) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <div
      class={cn("group/field-group @container/field-group z-field-group flex w-full flex-col", local.class)}
      data-slot="field-group"
      {...others}
    />
  );
};
type FieldGroupProps = ComponentProps<"div"> & { class?: string | undefined };

// LABEL -----------------------------------------------------------------------------------------------------------------------------------
export const FieldLabel = (props: FieldLabelProps) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <Label
      class={cn(
        "group/field-label peer/field-label z-field-label flex w-fit leading-snug",
        "has-[>[data-slot=field]]:w-full has-[>[data-slot=field]]:flex-col",
        local.class
      )}
      data-slot="field-label"
      {...others}
    />
  );
};
type FieldLabelProps = ComponentProps<typeof Label> & { class?: string | undefined };

// LEGEND ----------------------------------------------------------------------------------------------------------------------------------
export const FieldLegend = (props: FieldLegendProps) => {
  const [local, others] = splitProps(props, ["class", "variant"]);
  return <legend class={cn("z-field-legend", local.class)} data-slot="field-legend" data-variant={local.variant ?? "legend"} {...others} />;
};
type FieldLegendProps = ComponentProps<"legend"> & {
  class?: string | undefined;
  variant?: "legend" | "label";
};

// SEPARATOR -------------------------------------------------------------------------------------------------------------------------------
export const FieldSeparator = (props: FieldSeparatorProps) => {
  const [local, others] = splitProps(props, ["class", "children"]);
  return (
    <div class={cn("relative z-field-separator", local.class)} data-content={!!local.children} data-slot="field-separator" {...others}>
      <Separator class="absolute inset-0 top-1/2" />
      <Show when={local.children}>
        <span class="relative z-field-separator-content mx-auto block w-fit bg-background" data-slot="field-separator-content">
          {local.children}
        </span>
      </Show>
    </div>
  );
};
type FieldSeparatorProps = ComponentProps<"div"> & { class?: string | undefined; children?: JSX.Element };

// SET -------------------------------------------------------------------------------------------------------------------------------------
export const FieldSet = (props: FieldSetProps) => {
  const [local, others] = splitProps(props, ["class"]);
  return <fieldset class={cn("z-field-set flex flex-col", local.class)} data-slot="field-set" {...others} />;
};
type FieldSetProps = ComponentProps<"fieldset"> & { class?: string | undefined };

// TITLE -----------------------------------------------------------------------------------------------------------------------------------
export const FieldTitle = (props: FieldTitleProps) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <div class={cn("z-field-title z-font-heading flex w-fit items-center leading-snug", local.class)} data-slot="field-label" {...others} />
  );
};
type FieldTitleProps = ComponentProps<"div"> & { class?: string | undefined };
