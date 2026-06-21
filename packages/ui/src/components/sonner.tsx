import type { Component, ComponentProps, JSX } from "solid-js";
import { Toaster as Sonner } from "solid-sonner";
import { useColorMode } from "./color-mode";

// ROOT ------------------------------------------------------------------------------------------------------------------------------------
export const Toaster: Component<ToasterProps> = (props) => {
  const { colorMode } = useColorMode();
  return (
    <Sonner
      class="toaster group"
      icons={{
        success: <span class="icon-[lucide--circle-check] size-4" />,
        info: <span class="icon-[lucide--info] size-4" />,
        warning: <span class="icon-[lucide--triangle-alert] size-4" />,
        error: <span class="icon-[lucide--octagon-x] size-4" />,
        loading: <span class="icon-[lucide--loading-circle] size-4 animate-spin" />,
      }}
      position="top-center"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as JSX.CSSProperties
      }
      theme={colorMode()}
      {...props}
    />
  );
};
type ToasterProps = ComponentProps<typeof Sonner>;
