import { access, EventKey, getDocument, type MaybeAccessor } from "@ec/kobalte2/utils";
import { createEffect } from "@ec/kobalte2/utils/solid-compat";
import { isServer } from "@solidjs/web";
import { type Accessor, onCleanup } from "solid-js";

export interface CreateEscapeKeyDownProps {
  /** Whether the escape key down events should be listened or not. */
  isDisabled?: MaybeAccessor<boolean | undefined>;

  /** Event handler called when the escape key is down. */
  onEscapeKeyDown?: (event: KeyboardEvent) => void;

  /** The owner document to attach listeners to. */
  ownerDocument?: Accessor<Document>;
}

/**
 * Listens for when the escape key is down on the document.
 */
export function createEscapeKeyDown(props: CreateEscapeKeyDownProps) {
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === EventKey.Escape) {
      props.onEscapeKeyDown?.(event);
    }
  };

  createEffect(() => {
    if (isServer) {
      return;
    }

    if (access(props.isDisabled)) {
      return;
    }

    const document = props.ownerDocument?.() ?? getDocument();

    document.addEventListener("keydown", handleKeyDown);

    onCleanup(() => {
      document.removeEventListener("keydown", handleKeyDown);
    });
  });
}
