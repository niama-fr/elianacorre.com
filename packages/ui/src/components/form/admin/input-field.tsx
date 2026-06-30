import { Input, type InputProps } from "@ec/ui/components/input";
import { useFieldContext } from "@ec/ui/hooks/admin-form-context";

import { Field } from "./field";

// MAIN ------------------------------------------------------------------------------------------------------------------------------------
export default function InputField(props: InputFieldProps) {
  const { label, ...rest } = props;
  const { handleBlur, handleChange, name, state } = useFieldContext<string>();

  return (
    <Field label={label}>
      {(isInvalid) => (
        <Input
          aria-invalid={isInvalid}
          id={name}
          onBlur={handleBlur}
          onChange={(e) => {
            handleChange(e.target.value);
          }}
          placeholder={label}
          value={state.value}
          {...rest}
        />
      )}
    </Field>
  );
}
export type InputFieldProps = InputProps & { label: string };
