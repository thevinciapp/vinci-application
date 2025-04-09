import { marked } from "marked"
import { memo, useId, useMemo } from "react"
import ReactMarkdown, { Components } from "react-markdown"
import remarkGfm from "remark-gfm"
import { CodeBlock } from "shared/components/code-block"
import { cn } from "shared/types/utils"
import { FileText, Folder, Hash, Code, Clock } from "lucide-react"

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
// Component to display mentions of various content types
function ContentMention({ name, type }: { name: string; type?: string }) {
  // Get the appropriate icon based on content type
  const getIconForType = (type?: string): React.ReactNode => {
    switch (type) {
      case 'file':
        return <FileText className="h-3 w-3 text-cyan-400" />;
      case 'folder':
        return <Folder className="h-3 w-3 text-cyan-400" />;
      case 'gmail':
        return <Hash className="h-3 w-3 text-red-400" />;
      case 'gdrive':
        return <FileText className="h-3 w-3 text-blue-400" />;
      case 'dropbox':
        return <FileText className="h-3 w-3 text-blue-400" />;
      case 'github':
        return <Code className="h-3 w-3 text-purple-400" />;
      case 'conversation':
        return <Clock className="h-3 w-3 text-green-400" />;
      case 'message':
        return <Clock className="h-3 w-3 text-amber-400" />;
      default:
        return <FileText className="h-3 w-3 text-cyan-400" />;
    }
  };
  
  return (
    <span 
      className="inline-flex items-center gap-1 px-2 py-1 mr-1 mb-1 rounded bg-white/10 text-xs text-white/90"
      title={name}
    >
      {getIconForType(type)}
      <span className="truncate max-w-[150px]">{name}</span>
    </span>
  );
}

const INITIAL_COMPONENTS: Partial<Components> = {
  // Add custom content mention component
  span: function SpanComponent({ className, children, ...props }) {
    // Check if this is a content mention span
    if (className && className.includes('mention-')) {
      // Extract content type from className (e.g., mention-file, mention-gdrive)
      const type = className.replace('mention-', '');
      return <ContentMention name={children as string} type={type} />;
    }
    
    // Backward compatibility for old file-mention class
    if (className === 'file-mention') {
      return <ContentMention name={children as string} type="file" />;
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
        return <ContentMention name={fileName} type="file" />;
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
      <p className="leading-7 not-first:mt-4" {...props}>
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

// Function to preprocess markdown and transform content mentions
function preprocessMarkdown(markdown: string): string {
  // Find mentions in the format @[name](id)
  const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
  
  // Replace mentions with our custom component syntax
  return markdown.replace(mentionRegex, (match, name, id) => {
    // Replace any single backticks in the name to avoid breaking markdown
    const escapedName = name.replace(/`/g, "'");
    
    // Determine the content type from the ID
    let contentType = 'file'; // Default type
    
    if (id.startsWith('file-')) {
      contentType = 'file';
    } else if (id.startsWith('gdrive-')) {
      contentType = 'gdrive';
    } else if (id.startsWith('message-')) {
      contentType = 'message';
    } else if (id.startsWith('conversation-')) {
      contentType = 'conversation';
    } else if (id.startsWith('github-')) {
      contentType = 'github';
    } else if (id.startsWith('slack-')) {
      contentType = 'slack';
    } else if (id.startsWith('dropbox-')) {
      contentType = 'dropbox';
    }
    
    // Create a span with a class that indicates the content type
    return `<span class="mention-${contentType}">${escapedName}</span>`;
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
