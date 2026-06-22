import { useColorMode } from "@ec/ui2/color-mode";
import type { ComponentProps, JSX } from "@solidjs/web";
import type { Component } from "solid-js";
import { Toaster as Sonner } from "solid-sonner";

export const Toaster: Component<ToasterProps> = (props) => {
  const { colorMode } = useColorMode();
  return (
    <Sonner
      class="toaster group"
      icons={{
        error: <span class="icon-[lucide--octagon-x] size-4" />,
        info: <span class="icon-[lucide--info] size-4" />,
        loading: <span class="icon-[lucide--loader-circle] size-4 animate-spin" />,
        success: <span class="icon-[lucide--circle-check] size-4" />,
        warning: <span class="icon-[lucide--triangle-alert] size-4" />,
      }}
      position="top-center"
      style={
        {
          "--border-radius": "var(--radius)",
          "--normal-bg": "var(--popover)",
          "--normal-border": "var(--border)",
          "--normal-text": "var(--popover-foreground)",
        } as JSX.CSSProperties
      }
      theme={colorMode()}
      {...props}
    />
  );
};
type ToasterProps = ComponentProps<typeof Sonner>;
