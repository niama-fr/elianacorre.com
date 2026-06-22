import { FieldError as FieldErrorNative, FieldLabel, Field as FieldNative } from "@ec/ui/field";
import { useFieldContext } from "@ec/ui/hooks/form-context";
import { cva } from "class-variance-authority";
import { createMemo, type JSX } from "solid-js";

// STYLES ----------------------------------------------------------------------------------------------------------------------------------
const FIELD = {
  error: cva(
    `flex origin-top items-center gap-2 overflow-hidden rounded-md bg-destructive px-2 text-destructive-foreground 
    transition-[max-height] duration-150 ease-in before:icon-[lucide--circle-alert] before:size-4 before:shrink-0 before:content-['']`,
    { variants: { isInvalid: { false: "max-h-0", true: "max-h-10" } } }
  ),
  field: cva("gap-2"),
  label: cva("sr-only"),
};
const EMPTY_ERRORS: { message?: string }[] = [];

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
  const errors = createMemo(() => (props.isInvalid ? props.errors : EMPTY_ERRORS));

  return <FieldErrorNative class={FIELD.error({ isInvalid: props.isInvalid })} errors={errors()} />;
}
export type FieldErrorProps = { errors: { message?: string }[]; isInvalid: boolean };
