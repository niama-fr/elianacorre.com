import { Field, FieldError, FieldLabel } from "@ec/ui/components/form/web/field";
import { Textarea } from "@ec/ui/components/textarea";
import { useFieldContext } from "@ec/ui/hooks/web-form-context";

// MAIN ------------------------------------------------------------------------------------------------------------------------------------
export default function TextareaField({ label }: TextareaFieldProps) {
  const { handleBlur, handleChange, name, state } = useFieldContext<string>();

  return (
    <Field>
      {(isInvalid) => (
        <>
          <FieldLabel label={label} hideLabel />
          <Textarea
            aria-invalid={isInvalid}
            className="bg-white"
            id={name}
            name={name}
            onBlur={handleBlur}
            onChange={(e) => {
              handleChange(e.currentTarget.value);
            }}
            placeholder={label}
            value={state.value}
          />
          {isInvalid && <FieldError />}
        </>
      )}
    </Field>
  );
}
export type TextareaFieldProps = { label: string };
