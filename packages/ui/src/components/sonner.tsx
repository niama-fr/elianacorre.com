import { useLocation } from "@tanstack/react-router";
import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const pathname = useLocation({ select: (l) => l.pathname });
  const { theme: userTheme = "system" } = useTheme();
  const theme = (pathname.startsWith("/admin") ? userTheme : "light") as ToasterProps["theme"];

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      icons={{
        error: <span className="size-4 icon-[lucide--octagon-x]" />,
        info: <span className="size-4 icon-[lucide--info]" />,
        loading: <span className="size-4 animate-spin icon-[lucide--loader-2]" />,
        success: <span className="size-4 icon-[lucide--circle-check]" />,
        warning: <span className="size-4 icon-[lucide--triangle-alert]" />,
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
};

export { Toaster };
