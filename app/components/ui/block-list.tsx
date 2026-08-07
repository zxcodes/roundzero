'use client';

import type { TListElement } from 'platejs';
import type { ReactNode } from 'react';

import { isOrderedList } from '@platejs/list';
import {
  type PlateElementProps,
  type RenderNodeWrapper,
} from 'platejs/react';

export const BlockList: RenderNodeWrapper = (props) => {
  if (!props.element.listStyleType) return;
  if (!isOrderedList(props.element)) return;

  return (props) => <List {...props} />;
};

function List(props: PlateElementProps & { lineBreakBadge?: ReactNode }) {
  const { listStart, listStyleType } = props.element as TListElement;

  return (
    <ol
      className="relative m-0 p-0"
      style={{ listStyleType }}
      start={listStart}
    >
      <li>
      {props.children}
      {props.lineBreakBadge}
      </li>
    </ol>
  );
}
