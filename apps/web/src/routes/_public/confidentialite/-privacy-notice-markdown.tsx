import ReactMarkdown, { type Components, type UrlTransform } from "react-markdown";

const SAFE_URL = /^(?:https?:|mailto:|tel:|\/(?!\/)|#)/iu;

const transformSafeUrl: UrlTransform = (url) => (SAFE_URL.test(url) ? url : undefined);

const MARKDOWN_COMPONENTS: Components = {
  a: ({ children, node: _node, ...props }) => (
    <a {...props} className="underline hover:text-primary">
      {children}
    </a>
  ),
  h1: "h3",
  h2: ({ children, node: _node, ...props }) => (
    <h3 {...props} className="mt-6 text-2xl font-bold first:mt-0">
      {children}
    </h3>
  ),
  h3: "h4",
  h4: "h5",
  h5: "h6",
  h6: "h6",
  ul: ({ children, node: _node, ...props }) => (
    <ul {...props} className="list-disc space-y-2 pl-6">
      {children}
    </ul>
  ),
};

export function PrivacyNoticeMarkdown({ content }: PrivacyNoticeMarkdownProps) {
  if (content.trim().length === 0) throw new Error("EMPTY_PRIVACY_NOTICE_MARKDOWN");

  return (
    <ReactMarkdown components={MARKDOWN_COMPONENTS} urlTransform={transformSafeUrl}>
      {content}
    </ReactMarkdown>
  );
}

type PrivacyNoticeMarkdownProps = {
  content: string;
};
