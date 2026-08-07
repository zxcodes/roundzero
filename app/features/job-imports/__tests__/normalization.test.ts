import { describe, expect, it } from "vitest";

import { MAX_JOB_DESCRIPTION_LENGTH } from "@/features/jobs/constants";

import type { JobImportWarning } from "../schemas";
import { htmlToMarkdown, htmlToPlainText, normalizeDescription } from "../server/normalization";

describe("job import description normalization", () => {
  it("preserves readable structure while removing HTML", () => {
    const html = [
      "<h2>Who we are</h2>",
      "<p>Build the future&nbsp;with us.</p>",
      "<ul><li>Own the roadmap</li><li>Support customers</li></ul>",
    ].join("");

    expect(htmlToMarkdown(html)).toBe(
      "## Who we are\n\nBuild the future with us.\n\n- Own the roadmap\n- Support customers",
    );
  });

  it("removes escaped and double-escaped HTML", () => {
    expect(htmlToPlainText("&lt;h2&gt;About&lt;/h2&gt;&lt;p&gt;Hello&lt;/p&gt;")).toBe(
      "About\n\nHello",
    );
    expect(htmlToPlainText("&amp;amp;lt;h2&amp;amp;gt;About&amp;amp;lt;/h2&amp;amp;gt;")).toBe(
      "About",
    );
  });

  it("removes executable and styling content after decoding", () => {
    expect(
      htmlToPlainText(
        "&lt;style&gt;.hidden { display: none }&lt;/style&gt;&lt;p&gt;Visible&lt;/p&gt;&lt;script&gt;alert(1)&lt;/script&gt;",
      ),
    ).toBe("Visible");
  });

  it("is idempotent and preserves Markdown input", () => {
    const text = "Use a value < 5 and a result > 2.\n\n- Explain why.";

    expect(htmlToMarkdown(htmlToMarkdown(text))).toBe(text);
    expect(htmlToPlainText(text)).toBe("Use a value < 5 and a result > 2.\n\nExplain why.");
  });

  it("preserves TypeScript generic syntax in plain Markdown", () => {
    const text = "Use Array<T>, Map<K, V>, and Promise<Result>.";

    expect(htmlToMarkdown(text)).toBe(text);
  });

  it("creates a new requirements section after later description sections", () => {
    const description = [
      "## Requirements",
      "",
      "- TypeScript",
      "",
      "## Benefits",
      "",
      "- Remote work",
    ].join("\n");

    expect(normalizeDescription(description, [], ["TypeScript", "PostgreSQL"])).toBe(
      `${description}\n\n## Requirements\n\n- PostgreSQL`,
    );
  });

  it("does not treat a requirement as represented by a substring of another line", () => {
    expect(normalizeDescription("We build services with JavaScript.", [], ["Java"])).toBe(
      "We build services with JavaScript.\n\n## Requirements\n\n- Java",
    );
  });

  it("reserves space for imported requirements when shortening a description", () => {
    const warnings: JobImportWarning[] = [];
    const description = `## About the role\n\n${"word ".repeat(MAX_JOB_DESCRIPTION_LENGTH)}`;

    const normalized = normalizeDescription(description, warnings, ["TypeScript", "PostgreSQL"]);

    expect(normalized.length).toBeLessThanOrEqual(MAX_JOB_DESCRIPTION_LENGTH);
    expect(normalized.endsWith("## Requirements\n\n- TypeScript\n- PostgreSQL")).toBe(true);
    expect(warnings).toContainEqual(
      expect.objectContaining({ code: "description_shortened", field: "description" }),
    );
  });

  it("does not append requirements inside an overlong fenced code block", () => {
    const description = `<p>Intro paragraph.</p><pre>${"code ".repeat(
      MAX_JOB_DESCRIPTION_LENGTH,
    )}</pre>`;

    const normalized = normalizeDescription(description, [], ["Java"]);

    expect(normalized).toBe("Intro paragraph.\n\n## Requirements\n\n- Java");
    expect(normalized).not.toContain("```");
  });
});
