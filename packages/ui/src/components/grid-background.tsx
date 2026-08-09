import { cva } from "class-variance-authority";

// STYLES ----------------------------------------------------------------------------------------------------------------------------------
const GRID_BACKGROUND = {
  base: cva(
    "absolute inset-0 bg-[linear-gradient(to_right,var(--tw-gradient-from)_var(--tw-gradient-from-position),var(--tw-gradient-to)_var(--tw-gradient-to-position)),linear-gradient(to_bottom,var(--tw-gradient-from)_var(--tw-gradient-from-position),var(--tw-gradient-to)_var(--tw-gradient-to-position))] from-[#efefef] from-[1px] to-[transparent] to-[1px] bg-size-[30px_30px]"
  ),
  // bg-[linear-gradient(to_right,var(--tw-gradient-positions)),linear-gradient(to_bottom,var(--tw-gradient-positions)]`, FIXME: Tailwind
  radial: cva(
    "pointer-events-none absolute inset-0 flex items-center justify-center bg-white mask-radial-[ellipse_at_center,transparent_20%,black]"
  ),
};

// ROOT ------------------------------------------------------------------------------------------------------------------------------------
export function GridBackground() {
  return (
    <>
      <div className={GRID_BACKGROUND.base()} />
      <div className={GRID_BACKGROUND.radial()} />
    </>
  );
}
