import { splitProps } from "@ec/kobalte2/utils/solid-compat";
import {
	mergeRefs } from "@ec/kobalte2/utils";
import { Show } from "solid-js";
import { MenuPortal, type MenuPortalProps, useMenuContext } from "../menu";
import { useNavigationMenuContext } from "./navigation-menu-context";

export interface NavigationMenuPortalProps extends MenuPortalProps {
	ref?: HTMLElement | ((el: HTMLElement) => void);
}

/**
 * Portals its children into the NavigationMenu.Viewport when the menu is open.
 */
export function NavigationMenuPortal(props: NavigationMenuPortalProps) {
	const context = useNavigationMenuContext();
	const menuContext = useMenuContext();

	const [local, others] = splitProps(props, ["ref"]);

	return (
		<Show when={context.viewportPresent()}>
			<MenuPortal
				ref={mergeRefs((ref) => {
					if (ref) ref.setAttribute("role", "presentation");
				}, local.ref)}
				mount={
					menuContext.parentMenuContext() == null
						? context.viewportRef()
						: undefined
				}
				{...others}
			/>
		</Show>
	);
}
