import FileInputField from "@ec/ui/components/form/app/file-input-field";
import InputField from "@ec/ui/components/form/app/input-field";
import Submit from "@ec/ui/components/form/app/submit";
import { createFormHook } from "@tanstack/react-form";

import { fieldContext, formContext } from "./app-form-context";

export const { useAppForm, withForm, withFieldGroup } = createFormHook({
  fieldComponents: {
    FileInputField,
    InputField,
  },
  fieldContext,
  formComponents: {
    Submit,
  },
  formContext,
});
