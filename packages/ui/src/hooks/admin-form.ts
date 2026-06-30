import FileInputField from "@ec/ui/components/form/admin/file-input-field";
import InputField from "@ec/ui/components/form/admin/input-field";
import Submit from "@ec/ui/components/form/admin/submit";
import { createFormHook } from "@tanstack/react-form";

import { fieldContext, formContext } from "./admin-form-context";

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
