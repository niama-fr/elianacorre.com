import { useLocation } from "@tanstack/react-router";
import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

function Toaster({ ...props }: ToasterProps) {
  const pathname = useLocation({ select: (l) => l.pathname });
  const { theme: userTheme = "system" } = useTheme();
  const theme = (pathname.startsWith("/admin") ? userTheme : "light") as ToasterProps["theme"];

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      icons={{
        error: <span className="icon-[lucide--octagon-x] size-4" />,
        info: <span className="icon-[lucide--info] size-4" />,
        loading: <span className="icon-[lucide--loader-2] size-4 animate-spin" />,
        success: <span className="icon-[lucide--circle-check] size-4" />,
        warning: <span className="icon-[lucide--triangle-alert] size-4" />,
      }}
      style={
        {
          "--border-radius": "var(--radius)",
          "--normal-bg": "var(--popover)",
          "--normal-border": "var(--border)",
          "--normal-text": "var(--popover-foreground)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
