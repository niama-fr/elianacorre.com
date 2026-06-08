import type { JSX } from "@solidjs/web";
import { Show, useContext } from "solid-js";
import { DialogContext } from "./dialog-context";

// PORTAL ----------------------------------------------------------------------------------------------------------------------------------
export function DialogPortal(props: DialogPortalProps) {
  const context = useContext(DialogContext);

  return (
    <Show when={context.contentPresent() || context.overlayPresent()}>
      <DialogContext value={context}>{props.children}</DialogContext>
    </Show>
  );
}
export type DialogPortalProps = { children?: JSX.Element };
