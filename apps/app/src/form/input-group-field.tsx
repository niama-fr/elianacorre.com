import type { InputProps } from "@ec/ui/components/input";
import { InputGroup, InputGroupInput } from "@ec/ui/components/input-group";

import { useFieldContext } from "./context";
import { Field } from "./field";

// COMPONENT -------------------------------------------------------------------------------------------------------------------------------
export default function InputGroupField(props: InputGroupFieldProps) {
  const { children, description, label, ...rest } = props;
  const { handleBlur, handleChange, name, state } = useFieldContext<string>();

  return (
    <Field description={description} label={label}>
      {(isInvalid) => (
        <InputGroup>
          <InputGroupInput
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
          {children}
        </InputGroup>
      )}
    </Field>
  );
}
export type InputGroupFieldProps = InputProps & { description?: string; label: string };
