import { Input } from "@ec/ui/components/input";
import { useFieldContext } from "@ec/ui/hooks/public-form-context";

import { Field } from "./field";

// MAIN ------------------------------------------------------------------------------------------------------------------------------------
export default function InputField({ label, type }: InputFieldProps) {
  const { handleBlur, handleChange, name, state } = useFieldContext<string>();

  return (
    <Field label={label}>
      {(isInvalid) => (
        <Input
          aria-invalid={isInvalid}
          className="bg-white"
          id={name}
          onBlur={handleBlur}
          onChange={(e) => {
            handleChange(e.target.value);
          }}
          placeholder={label}
          type={type}
          value={state.value}
        />
      )}
    </Field>
  );
}
export type InputFieldProps = { label: string; type: string };
