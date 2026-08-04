import type { ComponentType } from "react";
import * as runtime from "react/jsx-runtime";

interface MDXContentProps {
  code: string;
  components?: Record<string, ComponentType>;
}

/** Renderiza únicamente MDX compilado por Velite durante el build. */
export function MDXContent({ code, components }: MDXContentProps) {
  const componentFactory = new Function(code);
  const Component = componentFactory({ ...runtime }).default as ComponentType<{
    components?: Record<string, ComponentType>;
  }>;

  return <Component components={components} />;
}
