'use client';

import * as React from 'react';

import { Redo02Icon, Undo02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useEditorRef, useEditorSelector } from 'platejs/react';

import { ToolbarButton } from './toolbar';

export function RedoToolbarButton(
  props: React.ComponentProps<typeof ToolbarButton>
) {
  const editor = useEditorRef();
  const disabled = useEditorSelector(
    (editor) => editor.history.redos.length === 0,
    []
  );
  const onClick = () => editor.redo();
  const onMouseDown = (event: React.MouseEvent) => event.preventDefault();

  return (
    <ToolbarButton
      {...props}
      disabled={disabled}
      onClick={onClick}
      onMouseDown={onMouseDown}
      tooltip="Redo"
    >
      <HugeiconsIcon icon={Redo02Icon} strokeWidth={2} />
    </ToolbarButton>
  );
}

export function UndoToolbarButton(
  props: React.ComponentProps<typeof ToolbarButton>
) {
  const editor = useEditorRef();
  const disabled = useEditorSelector(
    (editor) => editor.history.undos.length === 0,
    []
  );
  const onClick = () => editor.undo();
  const onMouseDown = (event: React.MouseEvent) => event.preventDefault();

  return (
    <ToolbarButton
      {...props}
      disabled={disabled}
      onClick={onClick}
      onMouseDown={onMouseDown}
      tooltip="Undo"
    >
      <HugeiconsIcon icon={Undo02Icon} strokeWidth={2} />
    </ToolbarButton>
  );
}
