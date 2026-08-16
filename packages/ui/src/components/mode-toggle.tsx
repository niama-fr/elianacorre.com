import { Button } from "@ec/ui/components/button";
import { useTheme } from "@ec/ui/components/theme-provider";

export function ModeToggle({ label = "Toggle theme" }: { label?: string }) {
  const { setTheme, theme } = useTheme();

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() => {
        setTheme(theme === "dark" ? "light" : "dark");
      }}
    >
      <span className="icon-[lucide--sun] h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
      <span className="icon-[lucide--moon] absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
      <span className="sr-only">{label}</span>
    </Button>
  );
}
