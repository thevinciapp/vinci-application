'use client'

import { useMemo } from 'react'
import MarkdownIt from 'markdown-it'
import DOMPurify from 'dompurify'
import hljs from 'highlight.js'
import { CodeBlock } from './code-block'
import type { Token } from 'markdown-it'

interface MarkdownRendererProps {
  content: string
  className?: string
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  const renderedContent = useMemo(() => {
    const md = new MarkdownIt({
      html: true,
      linkify: true,
      typographer: true,
      breaks: true,
      highlight: (str, lang) => {
        try {
          if (lang && hljs.getLanguage(lang)) {
            return hljs.highlight(str, { language: lang }).value
          } else {
            return hljs.highlightAuto(str).value
          }
        } catch (error) {
          console.error('Error highlighting code:', error)
          return str // Fallback to plain text if highlighting fails
        }
      }
    })

    // Customize inline code rendering with highlighting
    md.renderer.rules.code_inline = (tokens, idx, options, env, self) => {
      const token = tokens[idx]
      try {
        const highlighted = hljs.highlightAuto(token.content).value
        return `<code class="inline-code hljs">${highlighted}</code>`
      } catch (error) {
        console.error('Error highlighting inline code:', error)
        return `<code class="inline-code">${token.content}</code>`
      }
    }

    // Parse tokens
    const tokens = md.parse(content, {})
    const segments: { type: 'code' | 'text', content: string, language?: string }[] = []
    let textContent = ''
    let isInParagraph = false
    let lastTokenType = ''

    // Process tokens in order
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i]
      
      if (token.type === 'fence') {
        // If we have accumulated text content, push it first
        if (textContent.trim()) {
          segments.push({
            type: 'text',
            content: textContent
          })
          textContent = ''
        }
        // Push the code block with proper language
        segments.push({
          type: 'code',
          content: token.content.trim(),
          language: token.info.trim() || 'plain'
        })
      } else {
        // Handle paragraph structure and spacing
        if (token.type === 'heading_open') {
          if (textContent.trim()) {
            segments.push({
              type: 'text',
              content: md.render(textContent.trim())
            })
            textContent = ''
          }
          if (lastTokenType !== 'heading_close') {
            textContent += '\n\n'
          }
        } else if (token.type === 'heading_close') {
          textContent += '\n\n'
        } else if (token.type === 'paragraph_open') {
          isInParagraph = true
          if (textContent.trim() && lastTokenType !== 'heading_close') {
            textContent += '\n\n'
          }
        } else if (token.type === 'paragraph_close') {
          isInParagraph = false
          textContent += '\n\n'
        } else if (token.type === 'inline') {
          textContent += token.content
        } else if (token.type === 'softbreak' || token.type === 'hardbreak') {
          textContent += '\n'
        } else if (token.type === 'bullet_list_open' || token.type === 'ordered_list_open') {
          if (textContent.trim()) textContent += '\n\n'
        } else if (token.type === 'bullet_list_close' || token.type === 'ordered_list_close') {
          textContent += '\n\n'
        }
      }
      lastTokenType = token.type
    }

    // Push any remaining text content
    if (textContent.trim()) {
      segments.push({
        type: 'text',
        content: md.render(textContent.trim())
      })
    }

    // Render segments
    return segments.map((segment, index) => {
      if (segment.type === 'code') {
        return (
          <div className="my-8 first:mt-4 last:mb-4" key={index}>
            <CodeBlock
              code={segment.content}
              language={segment.language}
            />
          </div>
        )
      }
      
      const sanitizedHtml = DOMPurify.sanitize(segment.content, {
        ADD_ATTR: ['target', 'class']
      })
      
      return (
        <div
          key={index}
          className="prose-spacing"
          dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
        />
      )
    })
  }, [content])

  return (
    <div
      className={`prose prose-sm sm:prose lg:prose-lg xl:prose-xl dark:prose-invert max-w-none 
        prose-pre:bg-transparent prose-pre:p-0 
        prose-code:before:content-none prose-code:after:content-none
        prose-a:text-blue-400 prose-a:no-underline hover:prose-a:text-blue-300
        prose-p:text-zinc-300 prose-li:text-zinc-300 prose-strong:text-zinc-200
        prose-p:my-4 prose-ul:my-4 prose-ol:my-4 prose-blockquote:my-4
        prose-h1:mt-8 prose-h1:mb-4 
        prose-h2:mt-8 prose-h2:mb-4 
        prose-h3:mt-6 prose-h3:mb-4
        prose-h4:mt-6 prose-h4:mb-4
        [&_.prose-spacing>*:first-child]:mt-0 
        [&_.prose-spacing>*:last-child]:mb-0
        [&_.prose-spacing>h1+p]:mt-4
        [&_.prose-spacing>h2+p]:mt-4
        [&_.prose-spacing>h3+p]:mt-4
        [&_.prose-spacing>h4+p]:mt-4
        [&_.prose-spacing>p+h1]:mt-8
        [&_.prose-spacing>p+h2]:mt-8
        [&_.prose-spacing>p+h3]:mt-6
        [&_.prose-spacing>p+h4]:mt-6
        [&_.inline-code]:bg-white/[0.04]
        [&_.inline-code]:border
        [&_.inline-code]:border-white/[0.1]
        [&_.inline-code]:rounded-md
        [&_.inline-code]:px-1.5
        [&_.inline-code]:py-0.5
        [&_.inline-code]:text-[13px]
        [&_.inline-code]:font-mono
        [&_.inline-code]:whitespace-nowrap
        [&_.hljs-string]:text-teal-300/90
        [&_.hljs-number]:text-orange-300/90
        [&_.hljs-keyword]:text-purple-400/90
        [&_.hljs-function]:text-blue-300/90
        [&_.hljs-title]:text-indigo-300/90
        [&_.hljs-params]:text-zinc-300/80
        [&_.hljs-comment]:text-zinc-500/90
        [&_.hljs-built_in]:text-cyan-300/90
        [&_.hljs-literal]:text-red-300/90
        [&_.hljs-type]:text-emerald-300/90
        [&_.hljs-class]:text-yellow-300/90
        [&_.hljs-variable]:text-zinc-300/90
        [&_.hljs-meta]:text-zinc-400/80
        [&_.hljs-attr]:text-yellow-300/90
        [&_.hljs-selector-tag]:text-purple-300/90
        [&_.hljs-selector-class]:text-yellow-300/90
        [&_.hljs-selector-id]:text-blue-300/90
        [&_.hljs-property]:text-zinc-300/90
        [&_.hljs-operator]:text-zinc-500/90
        [&_.hljs-punctuation]:text-zinc-500/90
        [&_.hljs]:text-zinc-300/90
        ${className}`}
    >
      {renderedContent}
    </div>
  )
}
