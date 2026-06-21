import { cn } from "@ec/ui/lib/utils";
import { type ComponentProps, splitProps } from "solid-js";

type TextareaProps = ComponentProps<"textarea">;

const Textarea = (props: TextareaProps) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <textarea
      class={cn(
        "field-sizing-content z-textarea flex min-h-16 w-full outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
        local.class
      )}
      data-slot="textarea"
      {...others}
    />
  );
};

export { Textarea, type TextareaProps };
