// A lightweight syntax highlighter with VS Code-inspired theming
// Optimized for readability and performance

import { getHighlighter, type BundledLanguage, type BundledTheme } from 'shiki'

let highlighter: Awaited<ReturnType<typeof getHighlighter>> | null = null

const initializeHighlighter = async () => {
  if (!highlighter) {
    highlighter = await getHighlighter({
      themes: ['dracula'],
      langs: [
        'javascript',
        'typescript',
        'jsx',
        'tsx',
        'python',
        'java',
        'c',
        'cpp',
        'csharp',
        'go',
        'rust',
        'ruby',
        'php',
        'swift',
        'kotlin',
        'scala',
        'html',
        'css',
        'scss',
        'json',
        'yaml',
        'markdown',
        'sql',
        'shell',
        'bash',
        'powershell',
        'dockerfile',
        'graphql',
        'xml'
      ]
    })
  }
  return highlighter
}

const normalizeLanguage = (language: string): BundledLanguage => {
  const languageMap: Record<string, BundledLanguage> = {
    'js': 'javascript',
    'ts': 'typescript',
    'py': 'python',
    'rb': 'ruby',
    'rs': 'rust',
    'sh': 'shell',
    'yml': 'yaml',
    'md': 'markdown',
    'bash': 'shell',
    'zsh': 'shell',
    'cs': 'csharp',
    'plaintext': 'markdown',
    'txt': 'markdown'
  }

  return (languageMap[language] || language) as BundledLanguage
}

export const highlight = async (code: string, language: string): Promise<string> => {
  try {
    const instance = await initializeHighlighter()
    const normalizedLang = normalizeLanguage(language)
    
    const html = instance.codeToHtml(code, {
      lang: normalizedLang,
      theme: 'dracula'
    })

    // Enhance the HTML output with better styling
    return html
      .replace('<pre class="shiki"', '<pre class="shiki overflow-x-auto p-4 text-sm leading-relaxed font-mono"')
      .replace('<code>', '<code class="grid">')
      // Add line numbers
      .replace(
        /(<span class="line">)/g,
        '<span class="line flex"><span class="text-[#6272A4] opacity-50 select-none w-12 text-right pr-4 inline-block"></span>'
      )
  } catch (error) {
    // Fallback to basic HTML escaping if highlighting fails
    const escaped = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')

    return `<pre class="overflow-x-auto p-4 text-sm leading-relaxed font-mono bg-[#282A36] text-[#F8F8F2]"><code>${escaped}</code></pre>`
  }
} 