import CheckboxField from "@ec/ui/components/form/web/checkbox-field";
import InputField from "@ec/ui/components/form/web/input-field";
import Submit from "@ec/ui/components/form/web/submit";
import TextareaField from "@ec/ui/components/form/web/textarea-field";
import { createFormHook } from "@tanstack/react-form";

import { fieldContext, formContext } from "./web-form-context";

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
