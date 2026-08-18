import { Checkbox } from "@ec/ui/components/checkbox";
import { cva } from "class-variance-authority";

import { useFieldContext } from "./context";
import { Field, FieldLabel } from "./field";

// STYLES ----------------------------------------------------------------------------------------------------------------------------------
export const CHECKBOX_FIELD = {
  checkbox: cva(`aria-invalid:ring-destructive
  group-data-[intent=secondary]/form:data-checked:border-secondary group-data-[intent=secondary]/form:data-checked:bg-secondary
  group-data-[intent=secondary]/form:data-checked:text-secondary-foreground bg-white 
  aria-invalid:ring-2`),
};

// ROOT ------------------------------------------------------------------------------------------------------------------------------------
export default function CheckboxField({ label }: CheckboxFieldProps) {
  const { handleChange, name, state } = useFieldContext<boolean>();

  return (
    <Field orientation="horizontal" className="items-start">
      {(isInvalid) => (
        <>
          <Checkbox
            aria-invalid={isInvalid}
            id={name}
            name={name}
            checked={state.value}
            className={CHECKBOX_FIELD.checkbox()}
            onCheckedChange={(checked) => {
              handleChange(checked);
            }}
          />
          <FieldLabel label={label} className="text-justify text-pretty" />
        </>
      )}
    </Field>
  );
}
export type CheckboxFieldProps = { label: string };
