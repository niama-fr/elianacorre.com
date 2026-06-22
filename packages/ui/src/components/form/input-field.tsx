import { useFieldContext } from "@ec/ui/hooks/form-context";
import { Input } from "@ec/ui/input";

import { Field } from "./field";

// MAIN ------------------------------------------------------------------------------------------------------------------------------------
export default function InputField({ label, type }: InputFieldProps) {
  const field = useFieldContext<string>();

  return (
    <Field label={label}>
      {(isInvalid) => (
        <Input
          aria-invalid={isInvalid}
          id={field().name}
          onBlur={field().handleBlur}
          onChange={(e) => field().handleChange(e.target.value)}
          placeholder={label}
          type={type}
          value={field().state.value}
        />
      )}
    </Field>
  );
}
export type InputFieldProps = { label: string; type: string };
