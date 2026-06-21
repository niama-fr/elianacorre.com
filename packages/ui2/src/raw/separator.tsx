import type { PolymorphicProps } from "@ec/kobalte2/polymorphic";
import { Separator as SeparatorPrimitive, type SeparatorRootProps } from "@ec/kobalte2/separator";
import { cn } from "@ec/ui2/lib/utils";
import { type ComponentProps, mergeProps, splitProps, type ValidComponent } from "solid-js";

type SeparatorProps<T extends ValidComponent = "hr"> = PolymorphicProps<T, SeparatorRootProps<T>> & Pick<ComponentProps<T>, "class">;

const Separator = <T extends ValidComponent = "hr">(props: SeparatorProps<T>) => {
  const mergedProps = mergeProps({ orientation: "horizontal" } as const, props);
  const [local, others] = splitProps(mergedProps as SeparatorProps, ["class"]);
  return (
    <SeparatorPrimitive
      class={cn(
        "shrink-0 bg-border data-[orientation=horizontal]:h-px data-[orientation=vertical]:h-full data-[orientation=horizontal]:w-full data-[orientation=vertical]:w-px",
        local.class
      )}
      data-slot="separator"
      {...others}
    />
  );
};

export { Separator, type SeparatorProps };
