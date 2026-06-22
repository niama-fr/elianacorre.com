import InputField from "@ec/ui/form/input-field";
import Submit from "@ec/ui/form/submit";
import TextareaField from "@ec/ui/form/textarea-field";
import { createFormHook } from "@tanstack/solid-form";

import { fieldContext, formContext } from "./form-context";

export const { useAppForm, withForm, withFieldGroup } = createFormHook({
  fieldComponents: {
    InputField,
    TextareaField,
  },
  fieldContext,
  formComponents: {
    Submit,
  },
  formContext,
});
