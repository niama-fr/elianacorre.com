import { FieldError as FieldErrorNative, FieldLabel, Field as FieldNative } from "@ec/ui/components/field";
import { useFieldContext } from "@ec/ui/hooks/admin-form-context";
import { cva } from "class-variance-authority";

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
export function Field(props: FieldProps) {
  const { children, label } = props;
  const { form, name, state } = useFieldContext<string>();
  const isInvalid = (form.state.submissionAttempts > 0 || state.meta.isBlurred) && !state.meta.isValid;

  return (
    <FieldNative className={FIELD.field()} data-invalid={isInvalid}>
      <FieldLabel className={FIELD.label()} htmlFor={name}>
        {label}
      </FieldLabel>
      {children(isInvalid)}
      <FieldError errors={state.meta.errors} isInvalid={isInvalid} />
    </FieldNative>
  );
}
export type FieldProps = { children: (isInvalid: boolean) => React.ReactNode; label: string };

// ERROR -----------------------------------------------------------------------------------------------------------------------------------
export function FieldError(props: FieldErrorProps) {
  const { errors, isInvalid } = props;
  return <FieldErrorNative className={FIELD.error({ isInvalid })} errors={isInvalid ? errors : EMPTY_ERRORS} />;
}
export type FieldErrorProps = { errors: { message?: string }[]; isInvalid: boolean };
