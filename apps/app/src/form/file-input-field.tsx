import { Button } from "@ec/ui/components/button";
import type { InputProps } from "@ec/ui/components/input";
import { Input } from "@ec/ui/components/input";
import { useRef } from "react";

import { useFieldContext } from "./context";
import { Field } from "./field";

// COMPONENT -------------------------------------------------------------------------------------------------------------------------------
export default function FileInputField(props: FileInputFieldProps) {
  const { description, label, removeLabel, ...rest } = props;
  const { handleBlur, handleChange, name, state } = useFieldContext<File | null>();

  const ref = useRef<HTMLInputElement>(null);

  return (
    <Field description={description} label={label}>
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
            <Button
              size="sm"
              type="button"
              variant="outline"
              onClick={() => {
                if (ref.current) ref.current.value = "";
                handleChange(null);
              }}
            >
              {removeLabel}
            </Button>
          )}
        </>
      )}
    </Field>
  );
}
export type FileInputFieldProps = Omit<InputProps, "type"> & { description?: string; label: string; removeLabel: string };
