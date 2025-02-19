import { 
  Java, 
  Python, 
  JavaScript, 
  TypeScript, 
  RustLight, 
  Go, 
  CSharp, 
  Ruby, 
  PHP, 
  Swift, 
  Kotlin, 
  HTML5, 
  C,
  Clojure,
  Dart,
  CSS3, 
  JSON, 
  Markdown, 
  MicrosoftSQLServer,
  PostgreSQL,
  MySQL 
} from 'developer-icons'

interface LanguageIconProps {
  language: string
  size?: number
  className?: string
}

const LANGUAGE_ALIASES: Record<string, string> = {
  'cs': 'csharp',
  'c#': 'csharp',
  'js': 'javascript',
  'ts': 'typescript',
  'py': 'python',
  'rb': 'ruby',
  'go': 'golang',
  'rs': 'rust',
  'jsx': 'javascript',
  'tsx': 'typescript',
  'yml': 'yaml',
  'md': 'markdown',
  'sh': 'shell',
  'bash': 'shell',
  'zsh': 'shell',
  'mssql': 'sqlserver',
  'postgres': 'postgresql',
  'c++': 'c',
  'clj': 'clojure'
}

const LANGUAGE_COMPONENTS: Record<string, React.ComponentType<any>> = {
  python: Python,
  javascript: JavaScript,
  typescript: TypeScript,
  java: Java,
  rust: RustLight,
  golang: Go,
  csharp: CSharp,
  ruby: Ruby,
  php: PHP,
  swift: Swift,
  kotlin: Kotlin,
  html: HTML5,
  css: CSS3,
  json: JSON,
  markdown: Markdown,
  sql: MicrosoftSQLServer,
  sqlserver: MicrosoftSQLServer,
  postgresql: PostgreSQL,
  mysql: MySQL,
  c: C,
  clojure: Clojure,
  dart: Dart
}

export function LanguageIcon({ language, size = 16, className = '' }: LanguageIconProps) {
  const normalizedLanguage = language?.toLowerCase() || ''
  const canonicalLanguage = LANGUAGE_ALIASES[normalizedLanguage] || normalizedLanguage
  const IconComponent = LANGUAGE_COMPONENTS[canonicalLanguage]
  
  if (!IconComponent) return null
  
  return (
    <div className={`relative inline-block ${className}`}>
      <IconComponent size={size} />
    </div>
  )
} 