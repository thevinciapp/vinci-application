'use client'

import { useMemo, useState } from 'react'
import hljs from 'highlight.js'
import { Copy, Check } from 'lucide-react'
import { LanguageIcon } from './language-icon'

interface CodeBlockProps {
  code: string
  language?: string
  className?: string
}

export function CodeBlock({ code, language = 'plain', className = '' }: CodeBlockProps) {
  const [isCopied, setIsCopied] = useState(false)
  
  const highlightedCode = useMemo(() => {
    try {
      if (language && language !== 'plain' && hljs.getLanguage(language)) {
        return hljs.highlight(code, { language }).value
      }
      return hljs.highlightAuto(code).value
    } catch (error) {
      console.error('Error highlighting code:', error)
      return code
    }
  }, [code, language])

  return (
    <div className="relative">
      <div className="relative overflow-hidden rounded-xl bg-white/[0.03] border border-white/[0.05] transition-all duration-300 backdrop-blur-xl hover:bg-white/[0.05] hover:border-white/[0.1]">
        <div className="absolute right-4 top-3 flex items-center gap-1.5 z-10">
          <div className="px-2 py-0.5 rounded bg-white/[0.03] border border-white/[0.05] text-white/80 text-[10px] font-medium flex items-center gap-1.5 relative overflow-hidden w-fit
            before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/[0.07] before:to-white/[0.03] before:-z-10">
            <LanguageIcon language={language} size={12} className="text-white/60" />
            <span className="text-white/80">{language}</span>
          </div>
          <button 
            onClick={() => {
              navigator.clipboard.writeText(code)
              setIsCopied(true)
              setTimeout(() => setIsCopied(false), 2000)
            }}
            className="px-2 py-0.5 rounded bg-white/[0.03] border border-white/[0.05] text-white/80 text-[10px] font-medium flex items-center gap-1.5 relative overflow-hidden w-fit
              before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/[0.07] before:to-white/[0.03] before:-z-10
              hover:bg-white/[0.06] hover:border-white/[0.15] transition-all duration-300"
          >
            {isCopied ? (
              <>
                <Check className="w-3 h-3 text-white/60" />
                <span className="text-white/80">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 text-white/60" />
                <span className="text-white/80">Copy</span>
              </>
            )}
          </button>
        </div>
        <div className="relative">
          <pre className="hljs !bg-transparent pl-4 pt-12 pb-4">
            <code 
              className={`text-[13px] leading-relaxed hljs language-${language}`}
              dangerouslySetInnerHTML={{ __html: highlightedCode }}
            />
          </pre>
        </div>
      </div>
    </div>
  )
} 