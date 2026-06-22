/*
 * This file is based on code from react-spectrum.
 * Apache License Version 2.0, Copyright 2020 Adobe.
 *
 * Credits to the React Spectrum team:
 * https://github.com/adobe/react-spectrum/blob/810579b671791f1593108f62cdc1893de3a220e3/packages/@react-aria/overlays/src/ariaHideOutside.ts
 */

import { access, type MaybeAccessor } from "@ec/kobalte2/utils";
import { createEffect } from "@ec/kobalte2/utils/solid-compat";
import { onCleanup } from "solid-js";

import { DATA_TOP_LAYER_ATTR } from "../../dismissable-layer/layer-stack";
import { DATA_LIVE_ANNOUNCER_ATTR } from "../../live-announcer";

export type CreateHideOutsideProps = {
  /** Whether the hide outside behavior is disabled or not. */
  isDisabled?: MaybeAccessor<boolean | undefined>;

  /** Nothing will be hidden above this element. */
  root?: MaybeAccessor<HTMLElement | undefined>;
  /** The elements that should remain visible. */
  targets: MaybeAccessor<Element[]>;
};

/**
 * Hides all elements in the DOM outside the given targets from screen readers
 * using aria-hidden, and returns a function to revert these changes.
 * In addition, changes to the DOM are watched and new elements
 * outside the targets are automatically hidden.
 */
export function createHideOutside(props: CreateHideOutsideProps) {
  createEffect(() => {
    const targets = access(props.targets);

    if (access(props.isDisabled) || targets.length === 0) {
      return;
    }

    onCleanup(ariaHideOutside(targets, access(props.root)));
  });
}

type ObserverWrapper = {
  disconnect(): void;
  observe(): void;
};

// Keeps a ref count of all hidden elements.
// Added to when hiding an element, and subtracted from when showing it again.
// When it reaches zero, aria-hidden is removed.
const refCountMap = new WeakMap<Element, number>();
const observerStack: ObserverWrapper[] = [];

/**
 * Hides all elements in the DOM outside the given targets from screen readers using aria-hidden,
 * and returns a function to revert these changes. In addition, changes to the DOM are watched
 * and new elements outside the targets are automatically hidden.
 * @param targets - The elements that should remain visible.
 * @param root - Nothing will be hidden above this element.
 * @returns - A function to restore all hidden elements.
 */
export function ariaHideOutside(targets: Element[], root = document.body) {
  const visibleNodes = new Set<Element>(targets);
  const hiddenNodes = new Set<Element>();

  const walk = (root: Element) => {
    // Keep live announcer and top layer elements (e.g. toasts) visible.
    for (const element of root.querySelectorAll(`[${DATA_LIVE_ANNOUNCER_ATTR}], [${DATA_TOP_LAYER_ATTR}]`)) {
      visibleNodes.add(element);
    }

    const acceptNode = (node: Element) => {
      // Skip this node and its children if it is one of the target nodes, or a live announcer.
      // Also skip children of already hidden nodes, as aria-hidden is recursive. An exception is
      // made for elements with role="row" since VoiceOver on iOS has issues hiding elements with role="row".
      // For that case we want to hide the cells inside as well (https://bugs.webkit.org/show_bug.cgi?id=222623).
      if (
        visibleNodes.has(node) ||
        (node.parentElement && hiddenNodes.has(node.parentElement) && node.parentElement.getAttribute("role") !== "row")
      ) {
        return NodeFilter.FILTER_REJECT;
      }

      // Skip this node but continue to children if one of the targets is inside the node.
      for (const target of visibleNodes) {
        if (node.contains(target)) {
          return NodeFilter.FILTER_SKIP;
        }
      }

      return NodeFilter.FILTER_ACCEPT;
    };

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, {
      acceptNode,
    });

    // TreeWalker does not include the root. The root itself is only a boundary:
    // hiding document.body would hide the entire accessibility tree.
    const acceptRoot = acceptNode(root);
    if (acceptRoot !== NodeFilter.FILTER_REJECT) {
      let node = walker.nextNode() as Element;
      while (node != null) {
        hide(node);
        node = walker.nextNode() as Element;
      }
    }
  };

  const hide = (node: Element) => {
    const refCount = refCountMap.get(node) ?? 0;

    // If already aria-hidden, and the ref count is zero, then this element
    // was already hidden and there's nothing for us to do.
    if (node.getAttribute("aria-hidden") === "true" && refCount === 0) {
      return;
    }

    if (refCount === 0) {
      node.setAttribute("aria-hidden", "true");
    }

    hiddenNodes.add(node);
    refCountMap.set(node, refCount + 1);
  };

  // If there is already a MutationObserver listening from a previous call,
  // disconnect it so the new on takes over.
  if (observerStack.length) {
    observerStack.at(-1)?.disconnect();
  }

  walk(root);

  // Preserve upstream aria-hide behavior; this patch only adapts Solid 2 effect semantics.
  const observer = new MutationObserver((changes) => {
    for (const change of changes) {
      if (change.type !== "childList" || change.addedNodes.length === 0) {
        continue;
      }

      // If the parent element of the added nodes is not within one of the targets,
      // and not already inside a hidden node, hide all of the new children.
      if (![...visibleNodes, ...hiddenNodes].some((node) => node.contains(change.target))) {
        for (const node of change.removedNodes) {
          if (node instanceof Element) {
            visibleNodes.delete(node);
            hiddenNodes.delete(node);
          }
        }

        for (const node of change.addedNodes) {
          if (
            (node instanceof HTMLElement || node instanceof SVGElement) &&
            (node.dataset.liveAnnouncer === "true" || node.dataset.reactAriaTopLayer === "true")
          ) {
            visibleNodes.add(node);
          } else if (node instanceof Element) {
            walk(node);
          }
        }
      }
    }
  });

  observer.observe(root, { childList: true, subtree: true });

  const observerWrapper = {
    observe() {
      observer.observe(root, { childList: true, subtree: true });
    },
    disconnect() {
      observer.disconnect();
    },
  };

  observerStack.push(observerWrapper);

  return () => {
    observer.disconnect();

    for (const node of hiddenNodes) {
      const count = refCountMap.get(node);

      if (count == null) {
        return;
      }

      if (count === 1) {
        node.removeAttribute("aria-hidden");
        refCountMap.delete(node);
      } else {
        refCountMap.set(node, count - 1);
      }
    }

    // Remove this observer from the stack, and start the previous one.
    if (observerWrapper === observerStack.at(-1)) {
      observerStack.pop();
      if (observerStack.length) {
        observerStack.at(-1)?.observe();
      }
    } else {
      observerStack.splice(observerStack.indexOf(observerWrapper), 1);
    }
  };
}
