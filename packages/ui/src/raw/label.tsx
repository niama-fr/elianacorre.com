import type { ComponentProps } from "solid-js";
import { splitProps } from "solid-js";
import { cn } from "../lib/utils";

type LabelProps = ComponentProps<"label">;

const Label = (props: LabelProps) => {
  const [local, others] = splitProps(props, ["class"]);

  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: This primitive receives its control association through consumer props or nested children.
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

export { Label };
