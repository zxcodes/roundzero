'use client';

import type { TLinkElement } from 'platejs';
import type { PlateElementProps } from 'platejs/react';
import type { MouseEvent } from 'react';

import { getLinkAttributes } from '@platejs/link';
import { PlateElement } from 'platejs/react';

export function LinkElement(props: PlateElementProps<TLinkElement>) {
  const onMouseOver = (event: MouseEvent) => event.stopPropagation();
  return (
    <PlateElement
      {...props}
      as="a"
      className="font-medium text-primary underline decoration-primary underline-offset-4"
      attributes={{
        ...props.attributes,
        ...getLinkAttributes(props.editor, props.element),
        onMouseOver,
      }}
    >
      {props.children}
    </PlateElement>
  );
}
