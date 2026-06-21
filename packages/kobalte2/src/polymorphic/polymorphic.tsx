import type { OverrideProps } from "@ec/kobalte2/utils";
import type { ComponentProps, JSX, ValidComponent } from "@solidjs/web";
import { Dynamic } from "@solidjs/web";
import { omit } from "solid-js";

// ROOT ------------------------------------------------------------------------------------------------------------------------------------
export function Polymorphic<RenderProps>(_: RenderProps & PolymorphicAttributes<ValidComponent>): JSX.Element {
  const rest = omit(_, "as");
  if (!_.as) throw new Error("[kobalte]: Polymorphic is missing the required `as` prop.");
  return <Dynamic {...rest} component={_.as} />;
}

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type { OverrideComponentProps, OverrideProps } from "@ec/kobalte2/utils";

type EmptyProps = Record<never, never>;

export type ElementOf<T> = T extends HTMLElement ? T : T extends keyof HTMLElementTagNameMap ? HTMLElementTagNameMap[T] : any;

export type PolymorphicAttributes<T extends ValidComponent> = { as?: T | keyof JSX.HTMLElementTags };

export type PolymorphicProps<T extends ValidComponent, Props extends {} = EmptyProps> = OverrideProps<
  ComponentProps<T>, // Override props from custom/tag component with our own
  Props & // Accept custom props of our own component
    PolymorphicAttributes<T>
>;

export type PolymorphicCallbackProps<CustomProps extends {}, Options extends {}, RenderProps extends {}> = Omit<
  CustomProps,
  keyof Options | keyof RenderProps
> &
  RenderProps;
