import { marked } from "marked"
import { memo, useId, useMemo } from "react"
import ReactMarkdown, { Components } from "react-markdown"
import remarkGfm from "remark-gfm"
import { CodeBlock } from "../common/code-block"
import { cn } from "@/utils"

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

const INITIAL_COMPONENTS: Partial<Components> = {
  code: function CodeComponent({ className, children, ...props }) {
    const isInline =
      !props.node?.position?.start.line ||
      props.node?.position?.start.line === props.node?.position?.end.line

    if (isInline) {
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

function MarkdownComponent({
  children,
  id,
  className,
  components = INITIAL_COMPONENTS,
}: MarkdownProps) {
  const blocks = useMemo(() => {
    try {
      return parseMarkdownIntoBlocks(children)
    } catch (error) {
      console.error(error)
      return [children]
    }
  }, [children])

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
