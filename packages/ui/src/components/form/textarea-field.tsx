import { useFieldContext } from "@ec/ui/hooks/form-context";
import { Textarea } from "@ec/ui/textarea";

import { Field } from "./field";

// MAIN ------------------------------------------------------------------------------------------------------------------------------------
export default function TextareaField({ label }: TextareaFieldProps) {
  const field = useFieldContext<string>();

  return (
    <Field label={label}>
      {(isInvalid) => (
        <Textarea
          aria-invalid={isInvalid}
          id={field().name}
          onBlur={field().handleBlur}
          onChange={(e) => {
            field().handleChange(e.target.value);
          }}
          placeholder={label}
          value={field().state.value}
        />
      )}
    </Field>
  );
}
export type TextareaFieldProps = { label: string };
