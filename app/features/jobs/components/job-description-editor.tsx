"use client";

import {
  CodeIcon,
  Heading02Icon,
  Heading03Icon,
  LeftToRightBlockQuoteIcon,
  LeftToRightListBulletIcon,
  LeftToRightListNumberIcon,
  ParagraphIcon,
  TextBoldIcon,
  TextItalicIcon,
  TextStrikethroughIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { ListStyleType, toggleList } from "@platejs/list";
import { deserializeMd, MarkdownPlugin, serializeMd } from "@platejs/markdown";
import { Plate, useEditorRef, usePlateEditor } from "platejs/react";
import { useEffect, useRef } from "react";

import { BasicBlocksKit } from "@/components/editor/plugins/basic-blocks-kit";
import { BasicMarksKit } from "@/components/editor/plugins/basic-marks-kit";
import { LinkKit } from "@/components/editor/plugins/link-kit";
import { ListKit } from "@/components/editor/plugins/list-kit";
import { Editor, EditorContainer } from "@/components/ui/editor";
import { RedoToolbarButton, UndoToolbarButton } from "@/components/ui/history-toolbar-button";
import { LinkToolbarButton } from "@/components/ui/link-toolbar-button";
import { MarkToolbarButton } from "@/components/ui/mark-toolbar-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Toolbar, ToolbarButton, ToolbarSeparator } from "@/components/ui/toolbar";

const editorPlugins = [...BasicBlocksKit, ...BasicMarksKit, ...ListKit, ...LinkKit, MarkdownPlugin];

const blockOptions = [
  { icon: ParagraphIcon, label: "Paragraph", value: "p" },
  { icon: Heading02Icon, label: "Heading 2", value: "h2" },
  { icon: Heading03Icon, label: "Heading 3", value: "h3" },
  { icon: LeftToRightBlockQuoteIcon, label: "Quote", value: "blockquote" },
] as const;

function JobDescriptionToolbar() {
  const editor = useEditorRef();
  const onBlockTypeChange = (type: string) => {
    editor.tf.setNodes({ type });
    editor.tf.focus();
  };
  const onBulletedListClick = () => {
    toggleList(editor, { listStyleType: ListStyleType.Disc });
  };
  const onNumberedListClick = () => {
    toggleList(editor, { listStyleType: ListStyleType.Decimal });
  };
  const onToolbarMouseDown = (event: React.MouseEvent) => event.preventDefault();

  return (
    <Toolbar className="flex-wrap gap-0.5 border-b bg-muted/30 p-1" aria-label="Formatting">
      <UndoToolbarButton />
      <RedoToolbarButton />
      <ToolbarSeparator />
      <Select onValueChange={onBlockTypeChange}>
        <SelectTrigger className="h-8 w-32 border-0 bg-transparent shadow-none">
          <SelectValue placeholder="Text style" />
        </SelectTrigger>
        <SelectContent>
          {blockOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <HugeiconsIcon icon={option.icon} strokeWidth={2} />
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <ToolbarSeparator />
      <MarkToolbarButton nodeType="bold" tooltip="Bold">
        <HugeiconsIcon icon={TextBoldIcon} strokeWidth={2} />
      </MarkToolbarButton>
      <MarkToolbarButton nodeType="italic" tooltip="Italic">
        <HugeiconsIcon icon={TextItalicIcon} strokeWidth={2} />
      </MarkToolbarButton>
      <MarkToolbarButton nodeType="strikethrough" tooltip="Strikethrough">
        <HugeiconsIcon icon={TextStrikethroughIcon} strokeWidth={2} />
      </MarkToolbarButton>
      <MarkToolbarButton nodeType="code" tooltip="Inline code">
        <HugeiconsIcon icon={CodeIcon} strokeWidth={2} />
      </MarkToolbarButton>
      <ToolbarSeparator />
      <ToolbarButton
        type="button"
        tooltip="Bulleted list"
        onClick={onBulletedListClick}
        onMouseDown={onToolbarMouseDown}
      >
        <HugeiconsIcon icon={LeftToRightListBulletIcon} strokeWidth={2} />
      </ToolbarButton>
      <ToolbarButton
        type="button"
        tooltip="Numbered list"
        onClick={onNumberedListClick}
        onMouseDown={onToolbarMouseDown}
      >
        <HugeiconsIcon icon={LeftToRightListNumberIcon} strokeWidth={2} />
      </ToolbarButton>
      <LinkToolbarButton />
    </Toolbar>
  );
}

export function JobDescriptionEditor({
  id,
  value,
  onBlur,
  onChange,
  invalid,
  disabled = false,
}: {
  id: string;
  value: string;
  onBlur: () => void;
  onChange: (value: string) => void;
  invalid?: boolean;
  disabled?: boolean;
}) {
  const lastMarkdown = useRef(value);
  const editor = usePlateEditor({
    plugins: editorPlugins,
    value: (currentEditor) => deserializeMd(currentEditor, value),
  });

  useEffect(() => {
    if (value === lastMarkdown.current) return;
    lastMarkdown.current = value;
    editor.tf.setValue(deserializeMd(editor, value));
  }, [editor, value]);

  const onValueChange = ({ value: nextValue }: { value: typeof editor.children }) => {
    const markdown = serializeMd(editor, { value: nextValue });
    lastMarkdown.current = markdown;
    onChange(markdown);
  };

  return (
    <Plate editor={editor} onValueChange={onValueChange} readOnly={disabled}>
      <div
        className="overflow-hidden rounded-md border border-input bg-background focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30 data-[invalid=true]:border-destructive data-[invalid=true]:ring-destructive/20"
        data-invalid={invalid}
      >
        {disabled ? null : <JobDescriptionToolbar />}
        <EditorContainer className="h-auto max-h-128 min-h-64 rounded-none">
          <Editor
            id={id}
            className="min-h-64 px-4 py-3 text-sm"
            variant="none"
            placeholder="Describe the role, responsibilities, qualifications, and what makes this opportunity exciting..."
            aria-invalid={invalid}
            disabled={disabled}
            onBlur={onBlur}
          />
        </EditorContainer>
      </div>
    </Plate>
  );
}
