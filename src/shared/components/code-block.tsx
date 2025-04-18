"use client"

import { cn } from "@/shared/utils/cn-utils";
import React, { useEffect, useState, useMemo } from "react"
import { codeToHtml, ShikiTransformerContextSource, ThemedToken } from "shiki"
import { Copy, CheckIcon } from "lucide-react"
import { Root, Element } from 'hast';

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
  // Generate a unique key based on code content or props if available
  const uniqueKey = useMemo(() => {
    return code ? `${language}-${code.slice(0, 20)}-${Math.random().toString(36).slice(2, 7)}` : `codeblock-${Math.random().toString(36).slice(2)}`
  }, [code, language])

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
        key={uniqueKey} // Add unique key at the top level
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
                    <div 
                      className="flex items-center gap-1.5 text-xs rounded-md p-1.5 bg-white/[0.03] border border-white/[0.05] text-zinc-400"
                      key={`language-badge-${uniqueKey}`}
                    >
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
      key={uniqueKey} // Add unique key here too
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
    if (codeLength > 10000) {
      setIsLargeCode(true)
    } else {
      setIsLargeCode(false)
    }

    let isMounted = true
    
    const timer = setTimeout(async () => {
      try {
        const html = await codeToHtml(code, { 
          lang: language,
          theme: "github-dark",
          transformers: [{
            root(this: ShikiTransformerContextSource, node: Root) {
              // Cast to unknown first, then Element for accessing properties intentionally
              const nodeAsElement = node as unknown as Element; 
              if (!nodeAsElement.properties) nodeAsElement.properties = {};
              const style = (nodeAsElement.properties.style as string) || '';
              nodeAsElement.properties.style = style.replace(/background[^:]*:[^;]*;/g, 'background: transparent !important;');
              return node;
            },
            pre(this: ShikiTransformerContextSource, node: Element) {
              if (!node.properties) node.properties = {};
              const style = (node.properties.style as string) || '';
              node.properties.style = style.replace(/background[^:]*:[^;]*;/g, 'background: transparent !important;');
              return node;
            },
            code(this: ShikiTransformerContextSource, node: Element) {
              if (!node.properties) node.properties = {};
              const style = (node.properties.style as string) || '';
              node.properties.style = style.replace(/background[^:]*:[^;]*;/g, 'background: transparent !important;');
              return node;
            },
            line(this: ShikiTransformerContextSource, node: Element) {
              if (!node.properties) node.properties = {};
              const style = (node.properties.style as string) || '';
              if (style.includes('background')) {
                node.properties.style = style.replace(/background[^:]*:[^;]*;/g, 'background: transparent !important;');
              }
              return node;
            },
            // Correctly type the lines and return value. Iterate lines then tokens.
            tokens(this: ShikiTransformerContextSource, lines: ThemedToken[][]): ThemedToken[][] {
              return lines.map(line => { 
                // Iterate over tokens in the line. Remove style logic as ThemedToken has no properties.
                // Remove unused 'index' parameter.
                return line.map((token: ThemedToken) => {
                  // Background transparency handled in HAST node transformers (root, pre, code, line)
                  return token; 
                });
              });
            }
          }]
        });

        if (isMounted) {
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
    }, isLargeCode ? 100 : 0)

    return () => {
      isMounted = false
      clearTimeout(timer)
    }
  }, [code, language, theme, codeLength, isLargeCode])

  const classNames = cn(
    "w-full overflow-x-auto text-[13px] relative",
    "bg-transparent [&>pre]:bg-transparent [&>pre]:px-4 [&>pre]:py-4 [&>pre]:rounded-b-lg",
    "[&>pre>code]:bg-transparent [&>pre>code]:font-mono [&>pre>code]:text-zinc-200 [&>.shiki]:bg-transparent [&>.shiki]:px-4 [&>.shiki]:py-4 [&>.shiki]:rounded-b-lg",
    "backdrop-blur-[2px]",
    "glass-highlight",
    className
  )

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