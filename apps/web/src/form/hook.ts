import { createFormHook } from "@tanstack/react-form";

import CheckboxField from "./checkbox-field";
import { fieldContext, formContext } from "./context";
import InputField from "./input-field";
import Submit from "./submit";
import TextareaField from "./textarea-field";

export const { useAppForm, withForm, withFieldGroup } = createFormHook({
  fieldComponents: {
    CheckboxField,
    InputField,
    TextareaField,
  },
  fieldContext,
  formComponents: {
    Submit,
  },
  formContext,
});
