'use client';

import * as React from 'react';

import type { TLinkElement } from 'platejs';

import {
  ExternalLinkIcon,
  Link01Icon,
  TextIcon,
  Unlink01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  type UseVirtualFloatingOptions,
  flip,
  offset,
} from '@platejs/floating';
import { getLinkAttributes } from '@platejs/link';
import {
  type LinkFloatingToolbarState,
  FloatingLinkUrlInput,
  useFloatingLinkEdit,
  useFloatingLinkEditState,
  useFloatingLinkInsert,
  useFloatingLinkInsertState,
} from '@platejs/link/react';
import { cva } from 'class-variance-authority';
import { KEYS } from 'platejs';
import {
  useEditorRef,
  useEditorSelection,
  useFormInputProps,
  usePluginOption,
} from 'platejs/react';

import { Button, buttonVariants } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

const popoverVariants = cva(
  'z-50 w-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md outline-hidden'
);

const inputVariants = cva(
  'flex h-[28px] w-full rounded-md border-none bg-transparent px-1.5 py-1 text-base placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-transparent md:text-sm'
);

export function LinkFloatingToolbar({
  state,
}: {
  state?: LinkFloatingToolbarState;
}) {
  const activeCommentId = usePluginOption({ key: KEYS.comment }, 'activeId');
  const activeSuggestionId = usePluginOption(
    { key: KEYS.suggestion },
    'activeId'
  );

  const floatingOptions: UseVirtualFloatingOptions = {
    middleware: [
      offset(8),
      flip({
        fallbackPlacements: ['bottom-end', 'top-start', 'top-end'],
        padding: 12,
      }),
    ],
    placement:
      activeSuggestionId || activeCommentId ? 'top-start' : 'bottom-start',
  };

  const insertState = useFloatingLinkInsertState({
    ...state,
    floatingOptions: {
      ...floatingOptions,
      ...state?.floatingOptions,
    },
  });
  const {
    hidden,
    props: insertProps,
    ref: insertRef,
    textInputProps,
  } = useFloatingLinkInsert(insertState);

  const editState = useFloatingLinkEditState({
    ...state,
    floatingOptions: {
      ...floatingOptions,
      ...state?.floatingOptions,
    },
  });
  const {
    editButtonProps,
    props: editProps,
    ref: editRef,
    unlinkButtonProps,
  } = useFloatingLinkEdit(editState);
  const inputProps = useFormInputProps({
    preventDefaultOnEnterKeydown: true,
  });

  if (hidden) return null;

  const input = (
    <div className="flex w-[330px] flex-col" {...inputProps}>
      <div className="flex items-center">
        <div className="flex items-center pr-1 pl-2 text-muted-foreground">
          <HugeiconsIcon icon={Link01Icon} strokeWidth={2} className="size-4" />
        </div>

        <FloatingLinkUrlInput
          className={inputVariants()}
          placeholder="Paste link"
          data-plate-focus
        />
      </div>
      <Separator className="my-1" />
      <div className="flex items-center">
        <div className="flex items-center pr-1 pl-2 text-muted-foreground">
          <HugeiconsIcon icon={TextIcon} strokeWidth={2} className="size-4" />
        </div>
        <input
          className={inputVariants()}
          placeholder="Text to display"
          data-plate-focus
          {...textInputProps}
        />
      </div>
    </div>
  );

  const editContent = editState.isEditing ? (
    input
  ) : (
    <div className="box-content flex items-center">
      <Button
        size="sm"
        variant="ghost"
        type="button"
        {...editButtonProps}
      >
        Edit link
      </Button>

      <Separator orientation="vertical" />

      <LinkOpenButton />

      <Separator orientation="vertical" />

      <Button
        size="sm"
        variant="ghost"
        type="button"
        {...unlinkButtonProps}
      >
        <HugeiconsIcon icon={Unlink01Icon} strokeWidth={2} />
      </Button>
    </div>
  );

  return (
    <>
      <div ref={insertRef} className={popoverVariants()} {...insertProps}>
        {input}
      </div>

      <div ref={editRef} className={popoverVariants()} {...editProps}>
        {editContent}
      </div>
    </>
  );
}

function LinkOpenButton() {
  const editor = useEditorRef();
  useEditorSelection();
  const entry = editor.api.node<TLinkElement>({
    match: { type: editor.getType(KEYS.link) },
  });
  const attributes = entry ? getLinkAttributes(editor, entry[0]) : {};
  const onMouseOver = (event: React.MouseEvent) => event.stopPropagation();

  return (
    <a
      {...attributes}
      className={buttonVariants({
        size: 'sm',
        variant: 'ghost',
      })}
      onMouseOver={onMouseOver}
      aria-label="Open link in a new tab"
      target="_blank"
      rel="noopener noreferrer"
    >
      <HugeiconsIcon icon={ExternalLinkIcon} strokeWidth={2} />
    </a>
  );
}
