'use client'

import React, { JSX } from 'react'
import { useMemo } from 'react'
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'
import DOMPurify from 'dompurify'
import { CodeBlock } from './code-block'

interface MarkdownRendererProps {
  content: string
  className?: string
}

function configureMarkdownIt() {
  return new MarkdownIt({
    linkify: true,
    typographer: true,
    breaks: true,
    highlight: (str, lang) => {
      try {
        if (lang && hljs.getLanguage(lang)) {
          return hljs.highlight(str, { language: lang }).value
        }
        return hljs.highlightAuto(str).value
      } catch (error) {
        console.error('Error highlighting code:', error)
        return str 
      }
    }
  })
}

function configureInlineCodeRenderer(md: MarkdownIt) {
  md.renderer.rules.code_inline = (tokens, idx) => {
    const content = tokens[idx].content
    try {
      const highlighted = hljs.highlightAuto(content).value
      return `<code class="bg-zinc-800/50 border border-zinc-700 rounded-md px-1.5 py-0.5 text-[13px] font-mono">${highlighted}</code>`
    } catch (error) {
      console.error('Error highlighting inline code:', error)
      return `<code class="bg-zinc-800/50 border border-zinc-700 rounded-md px-1.5 py-0.5 text-[13px] font-mono text-zinc-100">${content}</code>`
    }
  }
}

function configureListRenderers(md: MarkdownIt) {
  md.renderer.rules.list_open = (tokens, idx) => {
    const token = tokens[idx]
    if (token.type === 'ordered_list_open') {
      return '<ol class="list-decimal">'
    }
    return '<ul class="list-disc">'
  }

  md.renderer.rules.list_item_open = (tokens, idx) => {
    if (tokens[idx + 2]?.content?.includes(':')) {
      const [title, ...rest] = tokens[idx + 2].content.split(':')
      tokens[idx + 2].content = `**${title.trim()}:**${rest.join(':')}`
    }
    return '<li>'
  }
}

function processContent(content: string) {
  return content
    .split('\n')
    .map(line => {
      const trimmedLine = line.trim()
      if (trimmedLine.startsWith('•')) {
        const textAfterBullet = trimmedLine.substring(1).trim()
        if (textAfterBullet.includes(':')) {
          const [title, ...rest] = textAfterBullet.split(':')
          return `- **${title.trim()}:**${rest.join(':')}`
        }
        return `- ${textAfterBullet}`
      }
      return line
    })
    .join('\n')
}

function processTokens(tokens: any[], md: MarkdownIt) {
  let currentGroup: typeof tokens = []
  const processedTokens: JSX.Element[] = []
  
  tokens.forEach((token, index) => {
    if (token.type === 'fence') {
      if (currentGroup.length > 0) {
        const rendered = md.renderer.render(currentGroup, md.options, {})
        const sanitized = DOMPurify.sanitize(rendered)
        if (sanitized.trim()) {
          processedTokens.push(
            <div key={`group-${index}`} dangerouslySetInnerHTML={{ __html: sanitized }} />
          )
        }
        currentGroup = []
      }
      
      processedTokens.push(
        <CodeBlock
          key={`fence-${index}`}
          code={token.content}
          language={token.info || 'plain'}
        />
      )
    } else {
      currentGroup.push(token)
    }
  })
  
  if (currentGroup.length > 0) {
    const rendered = md.renderer.render(currentGroup, md.options, {})
    const sanitized = DOMPurify.sanitize(rendered)
    if (sanitized.trim()) {
      processedTokens.push(
        <div key="final-group" dangerouslySetInnerHTML={{ __html: sanitized }} />
      )
    }
  }

  return processedTokens
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  const renderedContent = useMemo(() => {
    const md = configureMarkdownIt()
    configureInlineCodeRenderer(md)
    configureListRenderers(md)
    
    const processedContent = processContent(content)
    const tokens = md.parse(processedContent, {})
    return processTokens(tokens, md)
  }, [content])

  return (
    <div
      className={`
        max-w-none
        [&_h1]:mt-8 [&_h1]:mb-4
        [&_h2]:mt-8 [&_h2]:mb-4
        [&_h3]:mt-8 [&_h3]:mb-4
        [&_h4]:mt-8 [&_h4]:mb-4
        [&_h5]:mt-8 [&_h5]:mb-4
        [&_h6]:mt-8 [&_h6]:mb-4
        [&_p]:mt-4 [&_p]:mb-4
        [&_ul]:mt-4 [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-6
        [&_ol]:mt-4 [&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:pl-8
        [&_li]:mt-2 [&_li]:mb-2 [&_li]:pl-1
        [&_ol_li]:pl-0
        [&_strong]:font-semibold
        [&_blockquote]:mt-6 [&_blockquote]:mb-6 [&_blockquote]:pl-4 [&_blockquote]:border-l-2 [&_blockquote]:border-zinc-700 [&_blockquote]:italic
        [&_a]:text-blue-400 [&_a]:underline [&_a:hover]:text-blue-300
        [&_code.inline-code]:bg-zinc-800/50 [&_code.inline-code]:border [&_code.inline-code]:border-zinc-700 [&_code.inline-code]:rounded-md [&_code.inline-code]:px-1.5 [&_code.inline-code]:py-0.5 [&_code.inline-code]:text-[13px] [&_code.inline-code]:font-mono [&_code.inline-code]:text-zinc-100
        ${className}`}
    >
      {renderedContent}
    </div>
  )
}
