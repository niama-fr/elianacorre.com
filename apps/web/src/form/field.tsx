import type { FieldProps as FieldNativeProps } from "@ec/ui/components/field";
import { FieldError as FieldErrorNative, FieldLabel as FieldLabelNative, Field as FieldNative } from "@ec/ui/components/field";
import { cn } from "@ec/ui/lib/utils";
import { cva } from "class-variance-authority";

import { useFieldContext } from "./context";
import { validationMessage } from "./validation";

// STYLES ----------------------------------------------------------------------------------------------------------------------------------
const FIELD = {
  error: cva(
    `bg-destructive text-destructive-foreground before:icon-[lucide--circle-alert] flex origin-top items-center gap-2 overflow-hidden rounded-xl px-2
    py-1 before:size-4 before:shrink-0 before:content-['']`
  ),
  field: cva("data-[invalid=true]:text-destructive gap-2"),
  label: cva("data-hidden:sr-only"),
};

// ROOT ------------------------------------------------------------------------------------------------------------------------------------
export function Field({ children, className, ...rest }: FieldProps) {
  const { form, state } = useFieldContext<string>();

  const hasServerError = !!state.meta.errorMap.onServer;
  const shouldShowClientError = form.state.submissionAttempts > 0 || state.meta.isBlurred;
  const isInvalid = hasServerError || (shouldShowClientError && !state.meta.isValid);

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
  const errors = (state.meta.errors as readonly unknown[]).map(fieldError);
  return <FieldErrorNative className={FIELD.error()} errors={errors} />;
}

function fieldError(error: unknown) {
  if (typeof error === "string") return { message: validationMessage(error) };
  if (typeof error !== "object" || error === null || !("message" in error) || typeof error.message !== "string") return;
  return { message: validationMessage(error.message) };
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
