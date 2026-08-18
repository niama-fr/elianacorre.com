import type { InputProps } from "@ec/ui/components/input";
import { Input } from "@ec/ui/components/input";
import { cva } from "class-variance-authority";

import { useFieldContext } from "./context";
import { Field, FieldError, FieldLabel } from "./field";

// STYLES ----------------------------------------------------------------------------------------------------------------------------------
export const INPUT_FIELD = {
  input: cva(`focus-visible:ring-ring
    group-data-[intent=secondary]/form:focus-visible:border-secondary group-data-[intent=secondary]/form:focus-visible:ring-secondary 
    group-data-[intent=secondary]/form:focus-visible:aria-invalid:border-destructive group-data-[intent=secondary]/form:focus-visible:aria-invalid:ring-destructive
    aria-invalid:border-destructive aria-invalid:ring-destructive
    bg-white focus-visible:ring-2 aria-invalid:ring-2`),
};

// MAIN ------------------------------------------------------------------------------------------------------------------------------------
export default function InputField({ label, ...rest }: InputFieldProps) {
  const { handleBlur, handleChange, name, state } = useFieldContext<string>();

  return (
    <Field>
      {(isInvalid) => (
        <>
          {label && <FieldLabel label={label} hideLabel />}
          <Input
            {...rest}
            aria-invalid={isInvalid}
            className={INPUT_FIELD.input()}
            id={name}
            name={name}
            onBlur={handleBlur}
            onChange={(e) => {
              handleChange(e.target.value);
            }}
            placeholder={label}
            value={state.value}
          />
          {isInvalid && <FieldError />}
        </>
      )}
    </Field>
  );
}
export type InputFieldProps = InputProps & { label?: string };
