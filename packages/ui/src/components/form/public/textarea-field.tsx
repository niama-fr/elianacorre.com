import { Textarea } from "@ec/ui/components/textarea";
import { useFieldContext } from "@ec/ui/hooks/public-form-context";

import { Field } from "./field";

// MAIN ------------------------------------------------------------------------------------------------------------------------------------
export default function TextareaField({ label }: TextareaFieldProps) {
  const { handleBlur, handleChange, name, state } = useFieldContext<string>();

  return (
    <Field label={label}>
      {(isInvalid) => (
        <Textarea
          aria-invalid={isInvalid}
          className="bg-white"
          id={name}
          onBlur={handleBlur}
          onChange={(e) => {
            handleChange(e.currentTarget.value);
          }}
          placeholder={label}
          value={state.value}
        />
      )}
    </Field>
  );
}
export type TextareaFieldProps = { label: string };
