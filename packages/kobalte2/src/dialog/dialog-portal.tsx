import type { ComponentProps } from "@solidjs/web";
import { Portal } from "@solidjs/web";
import { Show } from "solid-js";

import { DialogContext, useDialogContext } from "./dialog-context";

export interface DialogPortalProps extends ComponentProps<typeof Portal> {}

/**
 * Portals its children into the `body` when the dialog is open.
 */
export function DialogPortal(props: DialogPortalProps) {
  const context = useDialogContext();

  return (
    <Show when={context.contentPresent() || context.overlayPresent()}>
      <Portal {...props}>
        <DialogContext value={context}>{props.children}</DialogContext>
      </Portal>
    </Show>
  );
}
