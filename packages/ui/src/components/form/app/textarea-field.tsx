import { Textarea } from "@ec/ui/components/textarea";
import { useFieldContext } from "@ec/ui/hooks/app-form-context";
import type { ComponentProps } from "react";

import { Field } from "./field";

// COMPONENT -------------------------------------------------------------------------------------------------------------------------------
export default function TextareaField(props: TextareaFieldProps) {
  const { description, label, ...rest } = props;
  const { handleBlur, handleChange, name, state } = useFieldContext<string>();

  return (
    <Field description={description} label={label}>
      {(isInvalid) => (
        <Textarea
          aria-invalid={isInvalid}
          id={name}
          onBlur={handleBlur}
          onChange={(event) => {
            handleChange(event.currentTarget.value);
          }}
          placeholder={label}
          value={state.value}
          {...rest}
        />
      )}
    </Field>
  );
}
export type TextareaFieldProps = ComponentProps<typeof Textarea> & { description?: string; label: string };
