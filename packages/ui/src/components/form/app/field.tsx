import { FieldDescription, FieldError as FieldErrorNative, FieldLabel, Field as FieldNative } from "@ec/ui/components/field";
import { useFieldContext } from "@ec/ui/hooks/app-form-context";
import { cva } from "class-variance-authority";

// CONSTS ----------------------------------------------------------------------------------------------------------------------------------
const EMPTY_ERRORS: { message?: string }[] = [];

// STYLES ----------------------------------------------------------------------------------------------------------------------------------
const FIELD = {
  error: cva(
    `bg-destructive text-destructive-foreground before:icon-[lucide--circle-alert] flex origin-top scale-0 items-center gap-2 overflow-hidden
    rounded-xl px-2 py-1 before:size-4 before:shrink-0 before:content-[''] data-[invalid=true]:scale-100`
  ),
  field: cva("gap-2"),
  header: cva("flex items-center justify-between gap-2"),
};

// COMPONENT ------------------------------------------------------------------------------------------------------------------------------
export function Field(props: FieldProps) {
  const { action, children, description, label } = props;
  const { form, name, state } = useFieldContext<string>();
  const isInvalid = (form.state.submissionAttempts > 0 || state.meta.isBlurred) && !state.meta.isValid;

  return (
    <FieldNative className={FIELD.field()} data-invalid={isInvalid}>
      <div className={FIELD.header()}>
        <FieldLabel htmlFor={name}>{label}</FieldLabel>
        {action}
      </div>
      {children(isInvalid)}
      {description && <FieldDescription>{description}</FieldDescription>}
      <FieldError errors={state.meta.errors} isInvalid={isInvalid} />
    </FieldNative>
  );
}
export type FieldProps = {
  action?: React.ReactNode;
  children: (isInvalid: boolean) => React.ReactNode;
  description?: string;
  label: string;
};

// COMPONENTS ------------------------------------------------------------------------------------------------------------------------------
export function FieldError(props: FieldErrorProps) {
  const { errors, isInvalid } = props;
  return <FieldErrorNative className={FIELD.error()} data-invalid={isInvalid} errors={isInvalid ? errors : EMPTY_ERRORS} />;
}
export type FieldErrorProps = { errors: { message?: string }[]; isInvalid: boolean };
