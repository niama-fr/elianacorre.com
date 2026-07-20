import type { FieldProps as FieldNativeProps } from "@ec/ui/components/field";
import { FieldError as FieldErrorNative, FieldLabel as FieldLabelNative, Field as FieldNative } from "@ec/ui/components/field";
import { useFieldContext } from "@ec/ui/hooks/public-form-context";
import { cn } from "@ec/ui/lib/utils";
import { cva } from "class-variance-authority";

// STYLES ----------------------------------------------------------------------------------------------------------------------------------
const FIELD = {
  error: cva(
    `flex origin-top items-center gap-2 overflow-hidden rounded-xl bg-destructive px-2 py-1 text-destructive-foreground
    before:icon-[lucide--circle-alert] before:size-4 before:shrink-0 before:content-['']`
  ),
  field: cva("gap-2 data-[invalid=true]:text-destructive"),
  label: cva("data-hidden:sr-only"),
};

// ROOT ------------------------------------------------------------------------------------------------------------------------------------
export function Field({ children, className, ...rest }: FieldProps) {
  const { form, state } = useFieldContext<string>();
  const isInvalid = (form.state.submissionAttempts > 0 || state.meta.isBlurred) && !state.meta.isValid;

  return (
    <FieldNative {...rest} className={cn(FIELD.field(), className)} data-invalid={isInvalid}>
      {children(isInvalid)}
    </FieldNative>
  );
}
export type FieldProps = Omit<FieldNativeProps, "children"> & { children: (isInvalid: boolean) => React.ReactNode };

// ERROR -----------------------------------------------------------------------------------------------------------------------------------
export function FieldError() {
  const { state } = useFieldContext<string>();
  return <FieldErrorNative className={FIELD.error()} errors={state.meta.errors} />;
}

// LABEL -----------------------------------------------------------------------------------------------------------------------------------
export function FieldLabel({ className, hideLabel = false, label }: FieldLabelProps) {
  const { name } = useFieldContext<string>();

  return (
    <FieldLabelNative className={cn(FIELD.label(), className)} htmlFor={name} data-hidden={hideLabel ? "" : undefined}>
      {label}
    </FieldLabelNative>
  );
}
export type FieldLabelProps = { className?: string; hideLabel?: boolean; label: string };
