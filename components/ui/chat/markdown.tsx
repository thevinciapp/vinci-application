import { marked } from "marked"
import { memo, useId, useMemo } from "react"
import ReactMarkdown, { Components } from "react-markdown"
import remarkGfm from "remark-gfm"
import { CodeBlock } from "../common/code-block"
import { cn } from "@/lib/utils"
import { FileText } from "lucide-react"

export type MarkdownProps = {
  children: string
  id?: string
  className?: string
  components?: Partial<Components>
}

function parseMarkdownIntoBlocks(markdown: string): string[] {
  const tokens = marked.lexer(markdown)
  return tokens.map((token) => token.raw)
}

function extractLanguage(className?: string): string {
  if (!className) return "plaintext"
  const match = className.match(/language-(\w+)/)
  return match ? match[1] : "plaintext"
}

// Custom component for rendering file mentions
function FileMention({ name }: { name: string }) {
  return (
    <span 
      className="inline-flex items-center gap-1 px-2 py-1 mr-1 mb-1 rounded bg-white/10 text-xs text-white/90"
      title={name}
    >
      <FileText className="h-3 w-3 text-cyan-400" />
      <span className="truncate max-w-[150px]">{name}</span>
    </span>
  );
}

const INITIAL_COMPONENTS: Partial<Components> = {
  // Add custom file mention component
  span: function SpanComponent({ className, children, ...props }) {
    // Check if this is a file mention span
    if (className === 'file-mention') {
      return <FileMention name={children as string} />;
    }
    
    // Otherwise render as regular span
    return <span className={className} {...props}>{children}</span>;
  },
  
  code: function CodeComponent({ className, children, ...props }) {
    const isInline =
      !props.node?.position?.start.line ||
      props.node?.position?.start.line === props.node?.position?.end.line

    if (isInline) {
      // Check if this is a file mention (starts with file:)
      const content = String(children);
      if (content.startsWith('file:')) {
        const fileName = content.substring(5); // Remove the 'file:' prefix
        return <FileMention name={fileName} />;
      }
      
      return (
        <span
          className={cn(
            "glass-effect px-1.5 py-0.5 text-[13px] font-mono text-zinc-200 rounded-md",
            "backdrop-blur-[4px] bg-white/[0.03] border border-white/[0.05]",
            className
          )}
          {...props}
        >
          {children}
        </span>
      )
    }

    const language = extractLanguage(className)

    return (
      <CodeBlock
        code={children as string}
        language={language}
        className={cn("glass-effect code-block-glow", className)}
      />
    )
  },
  pre: function PreComponent({ children }) {
    return <>{children}</>
  },
  // Enhance link styling
  a: function LinkComponent({ href, children, ...props }) {
    return (
      <a 
        href={href} 
        className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 transition-colors" 
        target="_blank" 
        rel="noopener noreferrer"
        {...props}
      >
        {children}
      </a>
    )
  },
  // Better list styling
  ul: function UlComponent({ children, ...props }) {
    return (
      <ul className="pl-6 list-disc space-y-1 my-4" {...props}>
        {children}
      </ul>
    )
  },
  ol: function OlComponent({ children, ...props }) {
    return (
      <ol className="pl-6 list-decimal space-y-1 my-4" {...props}>
        {children}
      </ol>
    )
  },
  // Headings with proper margins and styling
  h1: function H1Component({ children, ...props }) {
    return (
      <h1 className="text-2xl font-bold tracking-tight mt-8 mb-4 border-b border-zinc-800 pb-2" {...props}>
        {children}
      </h1>
    )
  },
  h2: function H2Component({ children, ...props }) {
    return (
      <h2 className="text-xl font-bold tracking-tight mt-6 mb-3" {...props}>
        {children}
      </h2>
    )
  },
  h3: function H3Component({ children, ...props }) {
    return (
      <h3 className="text-lg font-bold tracking-tight mt-5 mb-2" {...props}>
        {children}
      </h3>
    )
  },
  // Enhanced paragraph spacing
  p: function PComponent({ children, ...props }) {
    return (
      <p className="leading-7 [&:not(:first-child)]:mt-4" {...props}>
        {children}
      </p>
    )
  },
  // Better blockquote
  blockquote: function BlockquoteComponent({ children, ...props }) {
    return (
      <blockquote className="border-l-4 border-zinc-700 bg-zinc-900/30 pl-4 py-1 my-4 italic" {...props}>
        {children}
      </blockquote>
    )
  },
}

const MemoizedMarkdownBlock = memo(
  function MarkdownBlock({
    content,
    components,
    className,
  }: {
    content: string
    components: Partial<Components>
    className?: string
  }) {
    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={components}
        className={cn("prose-zinc max-w-none", className)}
      >
        {content}
      </ReactMarkdown>
    )
  },
  (prevProps, nextProps) => prevProps.content === nextProps.content
)

MemoizedMarkdownBlock.displayName = "MemoizedMarkdownBlock"

// Function to preprocess markdown and transform file mentions
function preprocessMarkdown(markdown: string): string {
  // Find file mentions in the format @[filename](file-id)
  const fileMentionRegex = /@\[([^\]]+)\]\(file-[^)]+\)/g;
  
  // Replace file mentions with our custom component syntax
  // We'll use a special format that won't be processed by other Markdown rules
  return markdown.replace(fileMentionRegex, (match, fileName) => {
    // Replace any single backticks in the filename to avoid breaking markdown
    const escapedName = fileName.replace(/`/g, "'");
    // Use a more compatible markdown format - inline code with a prefix
    return `\`file:${escapedName}\``;
  });
}

function MarkdownComponent({
  children,
  id,
  className,
  components = INITIAL_COMPONENTS,
}: MarkdownProps) {
  // Preprocess markdown to transform file mentions
  const processedChildren = useMemo(() => {
    return preprocessMarkdown(children);
  }, [children]);
  
  const blocks = useMemo(() => {
    try {
      return parseMarkdownIntoBlocks(processedChildren)
    } catch (error) {
      console.error(error)
      return [processedChildren]
    }
  }, [processedChildren])

  // Use a stable ID for the content blocks
  const contentId = useId()
  const uniqueId = id || contentId

  return (
    <div id={uniqueId} className={cn("text-sm text-zinc-100 leading-7", className)}>
      {blocks.map((content, i) => (
        <MemoizedMarkdownBlock
          key={`${uniqueId}-block-${i}`}
          content={content}
          components={components}
        />
      ))}
    </div>
  )
}

const Markdown = memo(MarkdownComponent)
Markdown.displayName = "Markdown"

export { Markdown }
