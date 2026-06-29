import { Button } from "@ec/ui/components/button";
import { useTheme } from "@ec/ui/components/theme-provider";

export function ModeToggle() {
  const { setTheme, theme } = useTheme();

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() => {
        setTheme(theme === "dark" ? "light" : "dark");
      }}
    >
      <span className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90 icon-[lucide--sun]" />
      <span className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0 icon-[lucide--moon]" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
