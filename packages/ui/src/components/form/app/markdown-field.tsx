import { MarkdownContent } from "@ec/ui/components/markdown";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@ec/ui/components/tabs";
import { Textarea } from "@ec/ui/components/textarea";
import { useFieldContext } from "@ec/ui/hooks/app-form-context";
import { cva } from "class-variance-authority";
import type { ComponentProps } from "react";

import { Field } from "./field";

// STYLES ----------------------------------------------------------------------------------------------------------------------------------
const MARKDOWN_FIELD = {
  preview: cva("border-input bg-input/10 min-h-40 w-full rounded-xl border p-4"),
  root: cva("w-full"),
  textarea: cva("min-h-64 font-mono"),
  toolbar: cva("mb-2"),
};

// COMPONENT -------------------------------------------------------------------------------------------------------------------------------
export default function MarkdownField(props: MarkdownFieldProps) {
  const { description, editLabel, label, modeLabel, previewLabel, ...rest } = props;
  const { handleBlur, handleChange, name, state } = useFieldContext<string>();

  return (
    <Field description={description} label={label}>
      {(isInvalid) => (
        <Tabs className={MARKDOWN_FIELD.root()} defaultValue="edit">
          <TabsList aria-label={modeLabel} className={MARKDOWN_FIELD.toolbar()}>
            <TabsTrigger value="edit">{editLabel}</TabsTrigger>
            <TabsTrigger value="preview">{previewLabel}</TabsTrigger>
          </TabsList>
          <TabsContent value="edit">
            <Textarea
              aria-invalid={isInvalid}
              className={MARKDOWN_FIELD.textarea()}
              id={name}
              onBlur={handleBlur}
              onChange={(event) => {
                handleChange(event.currentTarget.value);
              }}
              placeholder={label}
              value={state.value}
              {...rest}
            />
          </TabsContent>
          <TabsContent value="preview">
            <MarkdownContent className={MARKDOWN_FIELD.preview()} source={state.value} />
          </TabsContent>
        </Tabs>
      )}
    </Field>
  );
}
export type MarkdownFieldProps = ComponentProps<typeof Textarea> & {
  description?: string;
  editLabel: string;
  label: string;
  modeLabel: string;
  previewLabel: string;
};
