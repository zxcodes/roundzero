'use client';

import { type PlateElementProps, PlateElement } from 'platejs/react';

export function BlockquoteElement(props: PlateElementProps) {
  return (
    <PlateElement
      as="blockquote"
      className="my-1 border-l-2 border-border pl-4 leading-relaxed text-muted-foreground"
      {...props}
    />
  );
}
