import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps, JSX } from "solid-js";
import { createMemo, For, Show, splitProps } from "solid-js";
import { cn } from "@/lib/utils";
import { Label } from "@/raw/label";
import { Separator } from "@/raw/separator";

// ROOT ------------------------------------------------------------------------------------------------------------------------------------
export const FIELD = {
  base: cva("group/field flex w-full gap-3 data-[invalid=true]:text-destructive", {
    variants: {
      orientation: {
        vertical: "flex-col *:w-full [&>.sr-only]:w-auto",
        horizontal: `flex-row items-center 
          has-[>[data-slot=field-content]]:items-start has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px
          *:data-[slot=field-label]:flex-auto `,
        responsive: `flex-col *:w-full
        @md/field-group:flex-row @md/field-group:items-center @md/field-group:*:w-auto @md/field-group:has-[>[data-slot=field-content]]:items-start 
        @md/field-group:*:data-[slot=field-label]:flex-auto [&>.sr-only]:w-auto @md/field-group:has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px`,
      },
    },
    defaultVariants: {
      orientation: "vertical",
    },
  }),
  content: cva("group/field-content flex flex-1 flex-col gap-1 leading-snug"),
  description: cva(
    `nth-last-2:-mt-1 text-left font-normal text-muted-foreground text-sm leading-normal last:mt-0 
    group-has-data-[orientation=horizontal]/field:text-balance 
    [&>a:hover]:text-primary [&>a]:underline [&>a]:underline-offset-4 [[data-variant=legend]+&]:-mt-1.5`
  ),
  error: cva("font-normal text-destructive text-sm"),
  group: cva(
    "group/field-group @container/field-group flex w-full flex-col gap-7 data-[slot=checkbox-group]:gap-3 *:data-[slot=field-group]:gap-4"
  ),
  label: cva(
    `group/field-label peer/field-label flex w-fit gap-2 leading-snug 
    has-[>[data-slot=field]]:w-full has-[>[data-slot=field]]:flex-col has-[>[data-slot=field]]:rounded-xl 
    has-[>[data-slot=field]]:border has-data-checked:border-primary/50 has-data-checked:bg-primary/5 
    *:data-[slot=field]:p-4 group-data-[disabled=true]/field:opacity-50 peer-data-disabled:opacity-50`
  ),
  legend: cva("mb-3 font-medium data-[variant=label]:text-sm data-[variant=legend]:text-base"),
  separator: cva("relative -my-2 h-5 text-sm group-data-[variant=outline]/field-group:-mb-2"),
  separatorContent: cva("relative mx-auto block w-fit bg-background px-2 text-muted-foreground"),
  set: cva("flex flex-col gap-6 has-[>[data-slot=checkbox-group]]:gap-3 has-[>[data-slot=radio-group]]:gap-3"),
  title: cva("flex w-fit items-center gap-2 font-medium text-sm leading-snug group-data-[disabled=true]/field:opacity-50"),
};

export const Field = (props: FieldProps) => {
  const [_, others] = splitProps(props, ["class", "orientation"]);
  return (
    // biome-ignore lint/a11y/useSemanticElements: role="group" is intentional per shadcn design for accessibility
    <div
      class={cn(FIELD.base({ orientation: _.orientation }), _.class)}
      data-orientation={_.orientation ?? "vertical"}
      data-slot="field"
      role="group"
      {...others}
    />
  );
};
type FieldProps = ComponentProps<"div"> & VariantProps<typeof FIELD.base> & { class?: string | undefined };

// CONTENT ---------------------------------------------------------------------------------------------------------------------------------
export const FieldContent = (props: FieldContentProps) => {
  const [_, others] = splitProps(props, ["class"]);
  return <div class={cn(FIELD.content(), _.class)} data-slot="field-content" {...others} />;
};
type FieldContentProps = ComponentProps<"div"> & { class?: string | undefined };

// DESCRIPTION -----------------------------------------------------------------------------------------------------------------------------
export const FieldDescription = (props: FieldDescriptionProps) => {
  const [_, others] = splitProps(props, ["class"]);
  return <p class={cn(FIELD.description(), _.class)} data-slot="field-description" {...others} />;
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
      <div class={cn(FIELD.error(), _.class)} data-slot="field-error" role="alert" {...others}>
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
  const [_, others] = splitProps(props, ["class"]);
  return <div class={cn(FIELD.group(), _.class)} data-slot="field-group" {...others} />;
};
type FieldGroupProps = ComponentProps<"div"> & { class?: string | undefined };

// LABEL -----------------------------------------------------------------------------------------------------------------------------------
export const FieldLabel = (props: FieldLabelProps) => {
  const [_, others] = splitProps(props, ["class"]);
  return <Label class={cn(FIELD.label(), _.class)} data-slot="field-label" {...others} />;
};
type FieldLabelProps = ComponentProps<typeof Label> & { class?: string | undefined };

// LEGEND ----------------------------------------------------------------------------------------------------------------------------------
export const FieldLegend = (props: FieldLegendProps) => {
  const [_, others] = splitProps(props, ["class", "variant"]);
  return <legend class={cn(FIELD.legend(), _.class)} data-slot="field-legend" data-variant={_.variant ?? "legend"} {...others} />;
};
type FieldLegendProps = ComponentProps<"legend"> & {
  class?: string | undefined;
  variant?: "legend" | "label";
};

// SEPARATOR -------------------------------------------------------------------------------------------------------------------------------
export const FieldSeparator = (props: FieldSeparatorProps) => {
  const [_, others] = splitProps(props, ["class", "children"]);
  return (
    <div class={cn(FIELD.separator(), _.class)} data-content={!!_.children} data-slot="field-separator" {...others}>
      <Separator class="absolute inset-0 top-1/2" />
      <Show when={_.children}>
        <span class={FIELD.separatorContent()} data-slot="field-separator-content">
          {_.children}
        </span>
      </Show>
    </div>
  );
};
type FieldSeparatorProps = ComponentProps<"div"> & { class?: string | undefined; children?: JSX.Element };

// SET -------------------------------------------------------------------------------------------------------------------------------------
export const FieldSet = (props: FieldSetProps) => {
  const [_, others] = splitProps(props, ["class"]);
  return <fieldset class={cn(FIELD.set(), _.class)} data-slot="field-set" {...others} />;
};
type FieldSetProps = ComponentProps<"fieldset"> & { class?: string | undefined };

// TITLE -----------------------------------------------------------------------------------------------------------------------------------
export const FieldTitle = (props: FieldTitleProps) => {
  const [_, others] = splitProps(props, ["class"]);
  return <div class={cn(FIELD.title(), _.class)} data-slot="field-label" {...others} />;
};
type FieldTitleProps = ComponentProps<"div"> & { class?: string | undefined };
