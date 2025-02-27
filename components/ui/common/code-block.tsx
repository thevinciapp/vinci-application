"use client"

import { cn } from "@/utils"
import React, { useEffect, useState } from "react"
import { codeToHtml } from "shiki"
import { LanguageIcon } from "../chat/language-icon"
import { Copy, CheckIcon } from "lucide-react"

interface CopyButtonProps {
  code: string
}

function CopyButton({ code }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  return (
    <button
      onClick={handleCopy}
      className={cn(
        "flex items-center justify-center rounded-md p-1.5",
        "transition-all duration-200 ease-in-out",
        "bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.05]",
        copied 
          ? "text-green-400 hover:text-green-300 border-green-500/20 bg-green-500/10" 
          : "text-zinc-400 hover:text-zinc-200"
      )}
      title="Copy code"
    >
      {copied ? <CheckIcon size={14} /> : <Copy size={14} />}
    </button>
  )
}

export type CodeBlockProps = {
  children?: React.ReactNode
  className?: string
  code?: string
  language?: string
} & React.HTMLProps<HTMLDivElement>

function CodeBlock({ children, className, code, language, ...props }: CodeBlockProps) {
  if (code && language) {
    return (
      <div
        className={cn(
          "not-prose flex w-full flex-col overflow-hidden my-4 rounded-lg",
          "glass-effect code-block-glow glass-highlight",
          className
        )}
        style={{
          background: 'rgba(255, 255, 255, 0.02)',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.05)'
        }}
        {...props}
      >
        <div className="flex items-center justify-between w-full px-4 py-2 header" style={{background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid rgba(255, 255, 255, 0.05)'}}>
          <div className="flex items-center space-x-2">
            <div className="flex space-x-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/90 border border-red-600/30 shadow-inner shadow-red-700/20"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500/90 border border-yellow-600/30 shadow-inner shadow-yellow-700/20"></div>
              <div className="w-3 h-3 rounded-full bg-green-500/90 border border-green-600/30 shadow-inner shadow-green-700/20"></div>
            </div>
            <div className="text-xs text-zinc-400 ml-2">
              {code.split('\n')[0].startsWith('//') ? code.split('\n')[0].substring(2).trim() : ''}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {language && (
              <div className="flex items-center gap-1.5 text-xs rounded-md p-1.5 bg-white/[0.03] border border-white/[0.05] text-zinc-400">
                <LanguageIcon language={language} size={14} />
                <span>{language}</span>
              </div>
            )}
            <CopyButton code={code} />
          </div>
        </div>
        <CodeBlockCode code={code} language={language} />
      </div>
    )
  }
  
  return (
    <div
      className={cn(
        "not-prose flex w-full flex-col overflow-hidden my-4 rounded-lg",
        "glass-effect code-block-glow glass-highlight",
        className
      )}
      style={{
        background: 'rgba(255, 255, 255, 0.02)',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
        border: '1px solid rgba(255, 255, 255, 0.05)'
      }}
      {...props}
    >
      {children}
    </div>
  )
}

export type CodeBlockCodeProps = {
  code: string
  language?: string
  theme?: string
  className?: string
} & React.HTMLProps<HTMLDivElement>

function CodeBlockCode({
  code,
  language = "tsx",
  theme = "github-dark",
  className,
  ...props
}: CodeBlockCodeProps) {
  const [highlightedHtml, setHighlightedHtml] = useState<string | null>(null)
  const [isLargeCode, setIsLargeCode] = useState(false)
  const codeLength = code?.length || 0

  useEffect(() => {
    // For large code blocks (>10000 chars), set a flag to enable progressive rendering
    if (codeLength > 10000) {
      setIsLargeCode(true)
    } else {
      setIsLargeCode(false)
    }

    let isMounted = true
    
    // For extremely large code blocks, delay highlighting to avoid blocking the UI
    const timer = setTimeout(async () => {
      try {
        // Custom theme setup for transparent glass effect while maintaining syntax highlighting
        const customTheme = {
          name: 'glass-dark',
          type: 'dark',
          fg: '#EEEEEE',
          bg: '#00000000', // Fully transparent
          settings: [
            {
              settings: {
                background: '#00000000',
                foreground: '#EEEEEE',
                caret: '#FFFFFF',
                selection: 'rgba(128, 203, 255, 0.2)',
                selectionBorder: 'rgba(128, 203, 255, 0.4)',
                lineHighlight: 'rgba(255, 255, 255, 0.05)',
                gutterForeground: 'rgba(175, 175, 175, 0.5)',
                gutterBorder: 'rgba(255, 255, 255, 0.05)',
              }
            },
            {
              scope: ['comment', 'punctuation.definition.comment', 'string.comment'],
              settings: {
                foreground: 'rgba(106, 153, 85, 0.9)'
              }
            },
            {
              scope: ['string', 'constant.other.symbol'],
              settings: {
                foreground: 'rgba(206, 145, 120, 0.9)'
              }
            },
            {
              scope: ['keyword', 'storage.type', 'storage.modifier'],
              settings: {
                foreground: 'rgba(86, 156, 214, 0.9)'
              }
            },
            {
              scope: ['entity.name.function', 'support.function'],
              settings: {
                foreground: 'rgba(220, 220, 170, 0.9)'
              }
            },
            {
              scope: ['variable', 'support.variable'],
              settings: {
                foreground: 'rgba(156, 220, 254, 0.9)'
              }
            }
          ]
        };

        // Using the custom theme with glass effect compatibility
        const html = await codeToHtml(code, { 
          lang: language, 
          theme: "github-dark", // Use github-dark as it has better support
          // Apply glass compatibility to Shiki themes
          transformers: [{
            root(node) {
              // Force transparent background at the root level
              const nodeAsAny = node as any;
              if (!nodeAsAny.properties) nodeAsAny.properties = {};
              const style = nodeAsAny.properties.style || '';
              nodeAsAny.properties.style = style.replace(/background[^:]*:[^;]*;/g, 'background: transparent !important;');
              return node;
            },
            pre(node) {
              // Remove background from pre tag
              const nodeAsAny = node as any;
              if (!nodeAsAny.properties) nodeAsAny.properties = {};
              const style = nodeAsAny.properties.style || '';
              nodeAsAny.properties.style = style.replace(/background[^:]*:[^;]*;/g, 'background: transparent !important;');
              return node;
            },
            code(node) {
              // Remove background from code tag
              const nodeAsAny = node as any;
              if (!nodeAsAny.properties) nodeAsAny.properties = {};
              const style = nodeAsAny.properties.style || '';
              nodeAsAny.properties.style = style.replace(/background[^:]*:[^;]*;/g, 'background: transparent !important;');
              return node;
            },
            line(node) {
              // Make line transparent but preserve other styles
              const nodeAsAny = node as any;
              if (!nodeAsAny.properties) nodeAsAny.properties = {};
              const style = nodeAsAny.properties.style || '';
              if (style.includes('background')) {
                nodeAsAny.properties.style = style.replace(/background[^:]*:[^;]*;/g, 'background: transparent !important;');
              }
              return node;
            },
            tokens(node) {
              // Process each token to preserve foreground color but remove background
              return node.map((token: any) => {
                const tokenAsAny = token as any;
                if (!tokenAsAny.properties) tokenAsAny.properties = {};
                const style = tokenAsAny.properties.style || '';
                if (style.includes('background')) {
                  tokenAsAny.properties.style = style.replace(/background[^:]*:[^;]*;/g, '');
                }
                return token;
              });
            }
          }]
        });

        if (isMounted) {
          // Process the HTML to ensure highlighting works while maintaining transparency
          const processedHtml = html
            .replace(/background-color: #24292e;/g, 'background-color: transparent !important;')
            .replace(/background-color: #1f2428;/g, 'background-color: transparent !important;')
            .replace(/background: #24292e;/g, 'background: transparent !important;')
            .replace(/background: #1f2428;/g, 'background: transparent !important;');
          
          setHighlightedHtml(processedHtml);
        }
      } catch (error) {
        console.error('Error highlighting code:', error)
      }
    }, isLargeCode ? 100 : 0) // Small delay for large code blocks

    return () => {
      isMounted = false
      clearTimeout(timer)
    }
  }, [code, language, theme, codeLength, isLargeCode])

  const classNames = cn(
    "w-full overflow-x-auto text-[13px] relative",
    // Ensure there's no background colors in pre and code tags that would block the glass effect
    "bg-transparent [&>pre]:bg-transparent [&>pre]:px-4 [&>pre]:py-4 [&>pre]:rounded-b-lg",
    "[&>pre>code]:bg-transparent [&>pre>code]:font-mono [&>pre>code]:text-zinc-200 [&>.shiki]:bg-transparent [&>.shiki]:px-4 [&>.shiki]:py-4 [&>.shiki]:rounded-b-lg",
    "backdrop-blur-[2px]", // Add subtle blur to enhance text readability over the glass
    "glass-highlight", // New class for true glass effect
    className
  )

  // Use a simplified renderer for very large code blocks before highlighting is complete
  if (isLargeCode && !highlightedHtml) {
    return (
      <div className={cn(classNames, "glass-code-content")} style={{background: 'transparent'}} {...props}>
        <pre className="bg-transparent text-zinc-200 px-4 py-4 rounded-b-lg font-mono" style={{background: 'transparent'}}>
          <code className={`language-${language} bg-transparent font-mono`} style={{background: 'transparent'}}>
            {code.length > 50000 
              ? code.substring(0, 50000) + '...\n\n(Code truncated for performance - full code will appear shortly)'
              : code}
          </code>
        </pre>
      </div>
    )
  }

  // Standard rendering once highlighting is complete or for smaller code blocks
  return highlightedHtml ? (
    <div
      className={cn(classNames, "glass-code-content")}
      style={{background: 'transparent'}}
      dangerouslySetInnerHTML={{ __html: highlightedHtml }}
      {...props}
    />
  ) : (
    <div className={cn(classNames, "glass-code-content")} style={{background: 'transparent'}} {...props}>
      <pre className="bg-transparent text-zinc-200 px-4 py-4 rounded-b-lg font-mono" style={{background: 'transparent'}}>
        <code className="font-mono bg-transparent" style={{background: 'transparent'}}>{code}</code>
      </pre>
    </div>
  )
}

export type CodeBlockGroupProps = React.HTMLAttributes<HTMLDivElement>

function CodeBlockGroup({
  children,
  className,
  ...props
}: CodeBlockGroupProps) {
  return (
    <div
      className={cn("flex items-center justify-between", className)}
      {...props}
    >
      {children}
    </div>
  )
}

export { CodeBlockGroup, CodeBlockCode, CodeBlock }
