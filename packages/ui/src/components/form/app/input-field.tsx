import { Input, type InputProps } from "@ec/ui/components/input";
import { useFieldContext } from "@ec/ui/hooks/app-form-context";

import { Field } from "./field";

// COMPONENT -------------------------------------------------------------------------------------------------------------------------------
export default function InputField(props: InputFieldProps) {
  const { action, description, label, ...rest } = props;
  const { handleBlur, handleChange, name, state } = useFieldContext<string>();

  return (
    <Field action={action} description={description} label={label}>
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
export type InputFieldProps = InputProps & { action?: React.ReactNode; description?: string; label: string };
