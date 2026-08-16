import FileInputField from "@ec/ui/components/form/app/file-input-field";
import InputField from "@ec/ui/components/form/app/input-field";
import MarkdownField from "@ec/ui/components/form/app/markdown-field";
import Submit from "@ec/ui/components/form/app/submit";
import TextareaField from "@ec/ui/components/form/app/textarea-field";
import { createFormHook } from "@tanstack/react-form";

import { fieldContext, formContext } from "./app-form-context";

export const { useAppForm, withForm, withFieldGroup } = createFormHook({
  fieldComponents: {
    FileInputField,
    InputField,
    MarkdownField,
    TextareaField,
  },
  fieldContext,
  formComponents: {
    Submit,
  },
  formContext,
});
