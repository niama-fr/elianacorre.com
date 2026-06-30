import type { InputProps } from "@ec/ui/components/input";
import { Input } from "@ec/ui/components/input";
import { useFieldContext } from "@ec/ui/hooks/admin-form-context";
import { useRef } from "react";

import { Field } from "./field";

// MAIN ------------------------------------------------------------------------------------------------------------------------------------
export default function FileInputField(props: FileInputFieldProps) {
  const { label, ...rest } = props;
  const { handleBlur, handleChange, name, state } = useFieldContext<File | null>();

  const ref = useRef<HTMLInputElement>(null);

  return (
    <Field label={label}>
      {(isInvalid) => (
        <>
          <Input
            ref={ref}
            aria-invalid={isInvalid}
            id={name}
            onBlur={handleBlur}
            onChange={(e) => {
              handleChange(e.currentTarget.files?.[0] ?? null);
            }}
            placeholder={label}
            type="file"
            {...rest}
          />
          {state.value && (
            <button
              type="button"
              onClick={() => {
                if (ref.current) ref.current.value = "";
                handleChange(null);
              }}
            >
              Supprimer le fichier
            </button>
          )}
        </>
      )}
    </Field>
  );
}
export type FileInputFieldProps = Omit<InputProps, "type"> & { label: string };
