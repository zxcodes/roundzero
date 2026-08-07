import type { BlockNode, InlineNode } from "@tanstack/markdown";
import { parseMarkdown } from "@tanstack/markdown/parser";

function inlineText(node: InlineNode): string {
  if (node.type === "text" || node.type === "inlineCode") return node.value;
  if (node.type === "image") return node.alt;
  if (node.type === "break") return "\n";
  if (node.type === "footnoteReference") return "";
  if (node.type === "inlineHtml") return node.value.replaceAll(/<[^>]+>/g, "");
  return node.children.map(inlineText).join("");
}

function blockText(node: BlockNode): string {
  if (node.type === "heading" || node.type === "paragraph") {
    return node.children.map(inlineText).join("");
  }
  if (node.type === "code" || node.type === "html") return node.value;
  if (node.type === "thematicBreak") return "";
  if (node.type === "blockquote" || node.type === "callout" || node.type === "component") {
    return node.children.map(blockText).join("\n");
  }
  if (node.type === "list") {
    return node.items.map((item) => item.children.map(blockText).join(" ")).join("\n");
  }
  if (node.type === "table") {
    return [node.header, ...node.rows]
      .map((row) => row.map((cell) => cell.children.map(inlineText).join("")).join(" "))
      .join("\n");
  }
  return node.items.map((item) => item.children.map(blockText).join(" ")).join("\n");
}

export function markdownToPlainText(markdown: string): string {
  return parseMarkdown(markdown)
    .children.map(blockText)
    .join("\n\n")
    .replaceAll(/[ \t]+\n/g, "\n")
    .replaceAll(/\n{3,}/g, "\n\n")
    .trim();
}

export function markdownExcerpt(markdown: string, maxLength: number): string {
  const text = markdownToPlainText(markdown);
  if (text.length <= maxLength) return text;
  const shortened = text.slice(0, Math.max(0, maxLength - 1)).trimEnd();
  const lastSpace = shortened.lastIndexOf(" ");
  return `${lastSpace > maxLength / 2 ? shortened.slice(0, lastSpace) : shortened}…`;
}
