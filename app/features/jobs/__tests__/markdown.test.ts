import { deserializeMd, MarkdownPlugin, serializeMd } from "@platejs/markdown";
import { renderHtml } from "@tanstack/markdown";
import { createSlateEditor } from "platejs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { BasicBlocksKit } from "@/components/editor/plugins/basic-blocks-kit";
import { BasicMarksKit } from "@/components/editor/plugins/basic-marks-kit";
import { LinkKit } from "@/components/editor/plugins/link-kit";
import { ListKit } from "@/components/editor/plugins/list-kit";
import { JobDescriptionMarkdown } from "@/features/jobs/components/job-description-markdown";
import { markdownExcerpt, markdownToPlainText } from "@/features/jobs/markdown";

describe("job description Markdown", () => {
  it("round-trips the supported Plate subset", () => {
    const editor = createSlateEditor({
      plugins: [...BasicBlocksKit, ...BasicMarksKit, ...ListKit, ...LinkKit, MarkdownPlugin],
    });
    const markdown = [
      "# Platform Engineer",
      "",
      "Build **reliable** systems with [the team](https://example.com).",
      "",
      "## Requirements",
      "",
      "- TypeScript",
      "- Distributed systems",
      "",
      "> Ownership matters.",
    ].join("\n");

    const value = deserializeMd(editor, markdown);
    const serialized = serializeMd(editor, { value });

    expect(serialized).toContain("# Platform Engineer");
    expect(serialized).toContain("**reliable**");
    expect(serialized).toContain("[the team](https://example.com)");
    expect(serialized).toContain("* TypeScript\n* Distributed systems");
    expect(serialized).toContain("> Ownership matters.");
  });

  it("creates readable plain-text excerpts without Markdown syntax", () => {
    const markdown = "## Requirements\n\n- **TypeScript**\n- Clear communication";

    expect(markdownToPlainText(markdown)).toBe("Requirements\n\nTypeScript\nClear communication");
    expect(markdownExcerpt(markdown, 25)).toBe("Requirements\n\nTypeScript…");
  });

  it("escapes raw HTML and removes unsafe link protocols", () => {
    const html = renderHtml(
      "[unsafe](javascript:alert(1))\n\n<img src=x onerror=alert(1)>\n\n[safe](https://example.com)",
    );

    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(html).toContain('href="https://example.com"');
  });

  it("renders description headings below the page heading hierarchy", () => {
    const html = renderToStaticMarkup(
      createElement(
        JobDescriptionMarkdown,
        null,
        "# Legacy heading\n\n## Requirements\n\n### Details",
      ),
    );

    expect(html).not.toContain("<h1");
    expect(html).toContain(">Legacy heading</h2>");
    expect(html).toContain(">Requirements</h2>");
    expect(html).toContain(">Details</h3>");
    expect(html).not.toContain("<h4");
  });
});
