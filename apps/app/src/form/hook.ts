import { createFormHook } from "@tanstack/react-form";

import { fieldContext, formContext } from "./context";
import FileInputField from "./file-input-field";
import InputField from "./input-field";
import InputGroupField from "./input-group-field";
import MarkdownField from "./markdown-field";
import Submit from "./submit";
import TextareaField from "./textarea-field";

export const { useAppForm, withForm, withFieldGroup } = createFormHook({
  fieldComponents: {
    FileInputField,
    InputField,
    InputGroupField,
    MarkdownField,
    TextareaField,
  },
  fieldContext,
  formComponents: {
    Submit,
  },
  formContext,
});
