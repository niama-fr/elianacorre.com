import { cva } from "class-variance-authority";
import { createMemo, type JSX } from "solid-js";
import { FieldError as FieldErrorNative, FieldLabel, Field as FieldNative } from "@/components/field";
import { useFieldContext } from "@/hooks/form-context";

// STYLES ----------------------------------------------------------------------------------------------------------------------------------
const FIELD = {
  error: cva(
    `flex origin-top items-center gap-2 overflow-hidden rounded-md bg-destructive px-2 text-destructive-foreground 
    transition-[max-height] duration-150 ease-in`,
    { variants: { isInvalid: { true: "max-h-10", false: "max-h-0" } } }
  ),
  errorIcon: cva("icon-[lucide--circle-alert] size-4 py-8"),
  field: cva("gap-2"),
  label: cva("sr-only"),
};

// FIELD -----------------------------------------------------------------------------------------------------------------------------------
export function Field({ children, label }: FieldProps) {
  const field = useFieldContext<string>();
  const isInvalid = createMemo(
    () => (field().form.state.submissionAttempts > 0 || field().state.meta.isBlurred) && !field().state.meta.isValid
  );

  return (
    <FieldNative class={FIELD.field()} data-invalid={isInvalid()}>
      <FieldLabel class={FIELD.label()} for={field().name}>
        {label}
      </FieldLabel>
      {children(isInvalid())}
      <FieldError errors={field().state.meta.errors} isInvalid={isInvalid()} />
    </FieldNative>
  );
}
export type FieldProps = { children: (isInvalid: boolean) => JSX.Element; label: string };

// ERROR -----------------------------------------------------------------------------------------------------------------------------------
export function FieldError(props: FieldErrorProps) {
  return (
    <FieldErrorNative class={FIELD.error({ isInvalid: props.isInvalid })} errors={props.errors}>
      <span class={FIELD.errorIcon()} />
      {props.errors[0]?.message}
    </FieldErrorNative>
  );
}
export type FieldErrorProps = { errors: { message?: string }[]; isInvalid: boolean };
