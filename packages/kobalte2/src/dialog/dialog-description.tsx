import type { ValidComponent } from "@solidjs/web";
import { createEffect, merge, omit, useContext } from "solid-js";
import { Polymorphic, type PolymorphicProps } from "../polymorphic";
import { DialogContext } from "./dialog-context";

// DESCRIPTION -----------------------------------------------------------------------------------------------------------------------------
export function DialogDescription<T extends ValidComponent = "p">(props: PolymorphicProps<T, DialogDescriptionProps>) {
  const context = useContext(DialogContext);

  const _ = merge({ id: context.generateId("description") }, props as DialogDescriptionProps);
  const rest = omit(_, "id");

  createEffect(
    () => undefined,
    () => () => context.registerDescriptionId(_.id)
  );

  return <Polymorphic<DialogDescriptionRenderProps> as="p" id={_.id} {...rest} />;
}
export type DialogDescriptionProps = DialogDescriptionOptions & Partial<DialogDescriptionCommonProps>;

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type DialogDescriptionOptions = Record<never, never>;
export type DialogDescriptionCommonProps = { id: string };
export interface DialogDescriptionRenderProps extends DialogDescriptionCommonProps {}
