import type { ComponentProps } from "solid-js";
import { splitProps } from "solid-js";
import { cn } from "@/lib/utils";

// ROOT ------------------------------------------------------------------------------------------------------------------------------------
export const Label = (props: LabelProps) => {
  const [local, others] = splitProps(props, ["class"]);

  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: false positive
    <label
      class={cn(
        "z-label flex select-none items-center peer-disabled:cursor-not-allowed group-data-[disabled=true]:pointer-events-none",
        local.class
      )}
      data-slot="label"
      {...others}
    />
  );
};
type LabelProps = ComponentProps<"label">;
