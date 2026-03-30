import type React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface MarkdownRendererProps {
  content: string;
}

const styles = {
  h1: "text-2xl font-bold text-foreground mb-4 mt-6 first:mt-0",
  h2: "text-xl font-semibold text-foreground mb-3 mt-5 first:mt-0",
  h3: "text-lg font-semibold text-foreground mb-2 mt-4",
  p: "text-foreground leading-relaxed mb-4",
  ul: "list-disc list-inside space-y-1.5 mb-4 text-foreground",
  ol: "list-decimal list-inside space-y-1.5 mb-4 text-foreground",
  li: "text-foreground",
  strong: "font-semibold text-foreground",
  em: "italic text-muted-foreground",
  del: "line-through text-muted-foreground",
  hr: "border-border my-6",
  code: "font-mono text-sm bg-muted text-foreground px-1.5 py-0.5 rounded",
  pre: "bg-muted rounded-lg p-4 overflow-x-auto mb-4",
  blockquote: "border-l-4 border-primary pl-4 italic text-muted-foreground my-4",
};

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => <h1 className={styles.h1}>{children}</h1>,
        h2: ({ children }) => <h2 className={styles.h2}>{children}</h2>,
        h3: ({ children }) => <h3 className={styles.h3}>{children}</h3>,
        p: ({ children }) => <p className={styles.p}>{children}</p>,
        ul: ({ children }) => <ul className={styles.ul}>{children}</ul>,
        ol: ({ children }) => <ol className={styles.ol}>{children}</ol>,
        li: ({ children }) => <li className={styles.li}>{children}</li>,
        strong: ({ children }) => <strong className={styles.strong}>{children}</strong>,
        em: ({ children }) => <em className={styles.em}>{children}</em>,
        del: ({ children }) => <del className={styles.del}>{children}</del>,
        hr: () => <hr className={styles.hr} />,
        code: ({ className, children, ...props }) => {
          const isInline = !className?.includes("language-");
          if (isInline) {
            return <code className={styles.code} {...props}>{children}</code>;
          }
          return (
            <pre className={styles.pre}>
              <code className={cn("font-mono text-sm text-foreground", className)} {...props}>
                {children}
              </code>
            </pre>
          );
        },
        blockquote: ({ children }) => <blockquote className={styles.blockquote}>{children}</blockquote>,
      }}
    >
      {content}
    </ReactMarkdown>
  );
};

export default MarkdownRenderer;