import { Field, FieldError, FieldLabel } from "@ec/ui/components/form/public/field";
import type { InputProps } from "@ec/ui/components/input";
import { Input } from "@ec/ui/components/input";
import { useFieldContext } from "@ec/ui/hooks/public-form-context";
import { cva } from "class-variance-authority";

// STYLES ----------------------------------------------------------------------------------------------------------------------------------
export const INPUT_FIELD = {
  input: cva(`bg-white
    focus-visible:ring-[2px] focus-visible:ring-ring 
    group-data-[intent=secondary]/form:focus-visible:border-secondary group-data-[intent=secondary]/form:focus-visible:ring-secondary
    group-data-[intent=secondary]/form:focus-visible:aria-invalid:border-destructive group-data-[intent=secondary]/form:focus-visible:aria-invalid:ring-destructive
    aria-invalid:ring-[2px] aria-invalid:border-destructive aria-invalid:ring-destructive`),
};

// MAIN ------------------------------------------------------------------------------------------------------------------------------------
export default function InputField({ label, ...rest }: InputFieldProps) {
  const { handleBlur, handleChange, name, state } = useFieldContext<string>();

  return (
    <Field>
      {(isInvalid) => (
        <>
          <FieldLabel label={label} hideLabel />
          <Input
            {...rest}
            aria-invalid={isInvalid}
            className={INPUT_FIELD.input()}
            id={name}
            onBlur={handleBlur}
            onChange={(e) => {
              handleChange(e.target.value);
            }}
            placeholder={label}
            value={state.value}
          />
          <FieldError />
        </>
      )}
    </Field>
  );
}
export type InputFieldProps = InputProps & { label: string };
