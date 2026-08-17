import type { InputProps } from "@ec/ui/components/input";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@ec/ui/components/input-group";

import { useFieldContext } from "./context";
import { Field } from "./field";

// COMPONENT -------------------------------------------------------------------------------------------------------------------------------
export default function InputGroupField(props: InputGroupFieldProps) {
  const { description, label, onClick, ...rest } = props;
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
          <InputGroupAddon align="inline-end">
            <InputGroupButton aria-label="Copy" title="Copy" size="icon-xs" onClick={onClick}>
              <span className="icon-[tabler--refresh] size-4" />
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      )}
    </Field>
  );
}
export type InputGroupFieldProps = InputProps & { description?: string; label: string; onClick: () => void };
