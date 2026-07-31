import { Button } from "@ec/ui/components/button";
import { Link } from "@tanstack/react-router";
import { cva } from "class-variance-authority";

// STYLES ----------------------------------------------------------------------------------------------------------------------------------
const FOOTER = {
  base: cva("relative flex items-center justify-between bg-neutral-700 px-4 py-2 text-white"),
  button: cva("self-end h-auto text-white px-0 py-0.5"),
  buttons: cva("flex flex-col sm:flex-row sm:gap-4"),
};

// ROOT ------------------------------------------------------------------------------------------------------------------------------------
export function Footer() {
  return (
    <footer className={FOOTER.base()}>
      <span>© 2026 Eliana Corré</span>
      <div className={FOOTER.buttons()}>
        <Button render={<Link to="/confidentialite" />} variant="link" nativeButton={false} className={FOOTER.button()}>
          Confidentialité
        </Button>
        <Button render={<Link to="/mentions-legales" />} variant="link" nativeButton={false} className={FOOTER.button()}>
          Mentions légales
        </Button>
      </div>
    </footer>
  );
}
