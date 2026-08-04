import { describe, expect, it } from "vitest";

import { htmlToPlainText } from "../server/normalization";

describe("job import description normalization", () => {
  it("preserves readable structure while removing HTML", () => {
    const html = [
      "<h2>Who we are</h2>",
      "<p>Build the future&nbsp;with us.</p>",
      "<ul><li>Own the roadmap</li><li>Support customers</li></ul>",
    ].join("");

    expect(htmlToPlainText(html)).toBe(
      "Who we are\n\nBuild the future with us.\n\n- Own the roadmap\n- Support customers",
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

  it("is idempotent and preserves plain-text comparisons", () => {
    const text = "Use a value < 5 and a result > 2.\n\n- Explain why.";

    expect(htmlToPlainText(htmlToPlainText(text))).toBe(text);
  });
});
