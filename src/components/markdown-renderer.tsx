import type { ComponentProps } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

interface MarkdownRendererProps {
  content: string;
}

const headingLinkClass =
  'scroll-mt-24 font-semibold tracking-tight text-foreground';

function MarkdownLink(props: ComponentProps<'a'>) {
  const isExternal = props.href?.startsWith('http');
  return (
    <a
      {...props}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noreferrer' : undefined}
      className="font-medium text-primary underline underline-offset-4"
    />
  );
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ className, ...props }) => (
          <h1
            className={cn(headingLinkClass, 'mb-6 text-3xl', className)}
            {...props}
          />
        ),
        h2: ({ className, ...props }) => (
          <h2
            className={cn(
              headingLinkClass,
              'mb-3 mt-10 text-2xl first:mt-0',
              className
            )}
            {...props}
          />
        ),
        h3: ({ className, ...props }) => (
          <h3
            className={cn(headingLinkClass, 'mb-2 mt-8 text-xl', className)}
            {...props}
          />
        ),
        p: ({ className, ...props }) => (
          <p
            className={cn('my-4 leading-7 text-foreground/90', className)}
            {...props}
          />
        ),
        ul: ({ className, ...props }) => (
          <ul
            className={cn('my-4 ml-6 list-disc space-y-2', className)}
            {...props}
          />
        ),
        ol: ({ className, ...props }) => (
          <ol
            className={cn('my-4 ml-6 list-decimal space-y-2', className)}
            {...props}
          />
        ),
        a: MarkdownLink,
        hr: ({ className, ...props }) => (
          <hr className={cn('my-8 border-border', className)} {...props} />
        ),
        blockquote: ({ className, ...props }) => (
          <blockquote
            className={cn(
              'my-5 border-l-2 border-primary pl-4 text-muted-foreground',
              className
            )}
            {...props}
          />
        ),
        pre: ({ className, ...props }) => (
          <pre
            className={cn(
              'my-5 overflow-x-auto rounded-3xl bg-muted p-4 text-sm',
              className
            )}
            {...props}
          />
        ),
        code: ({ className, ...props }) => (
          <code
            className={cn(
              'rounded bg-muted px-1.5 py-0.5 font-mono text-sm',
              className
            )}
            {...props}
          />
        )
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
