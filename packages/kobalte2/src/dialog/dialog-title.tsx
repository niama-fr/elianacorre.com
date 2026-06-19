import type { ValidComponent } from "@solidjs/web";
import { createEffect, merge, omit, useContext } from "solid-js";
import { Polymorphic, type PolymorphicProps } from "../polymorphic";
import { DialogContext } from "./dialog-context";

// TITLE -----------------------------------------------------------------------------------------------------------------------------------
export function DialogTitle<T extends ValidComponent = "h2">(props: PolymorphicProps<T, DialogTitleProps>) {
  const context = useContext(DialogContext);

  const _ = merge({ id: context.generateId("title") }, props as DialogTitleProps);
  const rest = omit(_, "id");

  createEffect(
    () => undefined,
    () => () => context.registerTitleId(_.id)
  );

  return <Polymorphic<DialogTitleRenderProps> as="h2" id={_.id} {...rest} />;
}

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type DialogTitleOptions = Record<never, never>;
export type DialogTitleCommonProps = { id: string };
export interface DialogTitleRenderProps extends DialogTitleCommonProps {}
export type DialogTitleProps = DialogTitleOptions & Partial<DialogTitleCommonProps>;
