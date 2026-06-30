import InputField from "@ec/ui/components/form/public/input-field";
import Submit from "@ec/ui/components/form/public/submit";
import TextareaField from "@ec/ui/components/form/public/textarea-field";
import { createFormHook } from "@tanstack/react-form";

import { fieldContext, formContext } from "./public-form-context";

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
