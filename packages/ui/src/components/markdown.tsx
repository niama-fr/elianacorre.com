import { cn } from "@ec/ui/lib/utils";
import { Markdown } from "@tanstack/markdown/react";
import { cva } from "class-variance-authority";

// STYLES ----------------------------------------------------------------------------------------------------------------------------------
const MARKDOWN_CONTENT = {
  root: cva(`max-w-none break-words 
  [&_a]:underline 
  [&_blockquote]:border-l-2 [&_blockquote]:pl-4 
  [&_code]:font-mono 
  [&_h1]:my-4 [&_h1]:text-2xl [&_h1]:font-bold 
  [&_h2]:my-3 [&_h2]:text-xl [&_h2]:font-bold 
  [&_h3]:my-3 [&_h3]:text-lg [&_h3]:font-semibold 
  [&_ol]:list-decimal [&_ol]:pl-6 
  [&_p]:my-3 
  [&_pre]:overflow-x-auto 
  [&_ul]:list-disc [&_ul]:pl-6`),
};

// COMPONENT -------------------------------------------------------------------------------------------------------------------------------
export function MarkdownContent({ className, source }: MarkdownContentProps) {
  return (
    <div className={cn(MARKDOWN_CONTENT.root(), className)} data-slot="markdown-content">
      <Markdown>{source}</Markdown>
    </div>
  );
}
export type MarkdownContentProps = { className?: string; source: string };
