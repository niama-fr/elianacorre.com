import { cn } from "@ec/ui/lib/utils";
import { cva } from "class-variance-authority";
import type { ComponentProps } from "solid-js";
import { splitProps } from "solid-js";

// STYLES ----------------------------------------------------------------------------------------------------------------------------------
const LABEL = cva(`flex select-none items-center gap-2 font-medium text-sm leading-none 
  peer-disabled:cursor-not-allowed peer-disabled:opacity-50 
  group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50`);

// ROOT ------------------------------------------------------------------------------------------------------------------------------------
export const Label = (props: LabelProps) => {
  const [_, others] = splitProps(props, ["class"]);

  return (
    // Consumers associate this primitive with a control through props or children.
    // oxlint-disable-next-line jsx-a11y/label-has-associated-control
    <label class={cn(LABEL(), _.class)} data-slot="label" {...others} />
  );
};
type LabelProps = ComponentProps<"label">;
