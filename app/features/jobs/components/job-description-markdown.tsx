import type { MarkdownComponents } from "@tanstack/markdown/react";
import { Markdown } from "@tanstack/markdown/react";

import { cn } from "@/lib/utils";

function MarkdownLink({ children, ...props }: React.ComponentProps<"a">) {
  const external = /^https?:\/\//i.test(props.href ?? "");
  return (
    <a
      {...props}
      className="font-medium text-primary underline underline-offset-4"
      rel={external ? "nofollow noopener noreferrer" : props.rel}
      target={external ? "_blank" : props.target}
    >
      {children}
    </a>
  );
}

function MarkdownImage({ alt }: React.ComponentProps<"img">) {
  return alt ? <span>{alt}</span> : null;
}

function MarkdownBlockquote(props: React.ComponentProps<"blockquote">) {
  return <blockquote {...props} className="border-l-2 border-border pl-4 text-muted-foreground" />;
}

function MarkdownCode(props: React.ComponentProps<"code">) {
  return <code {...props} className="rounded bg-muted px-1 py-0.5 font-mono text-sm" />;
}

function MarkdownHeading1({ children, ...props }: React.ComponentProps<"h1">) {
  return (
    <h1 {...props} className="text-xl font-semibold tracking-tight">
      {children}
    </h1>
  );
}

function MarkdownHeading2({ children, ...props }: React.ComponentProps<"h2">) {
  return (
    <h2 {...props} className="text-lg font-semibold tracking-tight">
      {children}
    </h2>
  );
}

function MarkdownHeading3({ children, ...props }: React.ComponentProps<"h3">) {
  return (
    <h3 {...props} className="text-base font-semibold tracking-tight">
      {children}
    </h3>
  );
}

function MarkdownHeading4({ children, ...props }: React.ComponentProps<"h4">) {
  return (
    <h4 {...props} className="text-sm font-semibold tracking-tight">
      {children}
    </h4>
  );
}

function MarkdownHeading5({ children, ...props }: React.ComponentProps<"h5">) {
  return (
    <h5 {...props} className="text-sm font-semibold tracking-tight">
      {children}
    </h5>
  );
}

function MarkdownHeading6({ children, ...props }: React.ComponentProps<"h6">) {
  return (
    <h6 {...props} className="text-sm font-semibold tracking-tight">
      {children}
    </h6>
  );
}

function MarkdownHorizontalRule(props: React.ComponentProps<"hr">) {
  return <hr {...props} className="border-border" />;
}

function MarkdownListItem(props: React.ComponentProps<"li">) {
  return <li {...props} className="pl-1" />;
}

function MarkdownOrderedList(props: React.ComponentProps<"ol">) {
  return <ol {...props} className="list-decimal pl-6" />;
}

function MarkdownParagraph(props: React.ComponentProps<"p">) {
  return <p {...props} className="leading-relaxed" />;
}

function MarkdownPre(props: React.ComponentProps<"pre">) {
  return <pre {...props} className="overflow-x-auto rounded-md bg-muted p-3 text-sm" />;
}

function MarkdownUnorderedList(props: React.ComponentProps<"ul">) {
  return <ul {...props} className="list-disc pl-6" />;
}

const components = {
  a: MarkdownLink,
  blockquote: MarkdownBlockquote,
  code: MarkdownCode,
  h1: MarkdownHeading1,
  h2: MarkdownHeading2,
  h3: MarkdownHeading3,
  h4: MarkdownHeading4,
  h5: MarkdownHeading5,
  h6: MarkdownHeading6,
  hr: MarkdownHorizontalRule,
  img: MarkdownImage,
  li: MarkdownListItem,
  ol: MarkdownOrderedList,
  p: MarkdownParagraph,
  pre: MarkdownPre,
  ul: MarkdownUnorderedList,
} satisfies MarkdownComponents;

export function JobDescriptionMarkdown({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3 text-sm text-foreground/90", className)}>
      <Markdown components={components}>{children}</Markdown>
    </div>
  );
}
