import { ReactNode, CSSProperties } from 'react'

interface BaseTabProps {
  icon?: ReactNode
  label: string
  shortcut?: string
  onClick?: () => void
  minWidth?: 'space' | 'model' | 'actions'
  roundedBottom?: boolean
  isActive?: boolean
  style?: CSSProperties
  wrapperStyle?: CSSProperties
  className?: string
  color?: string
}

export function BaseTab({ 
  icon, 
  color,
  label, 
  shortcut, 
  onClick, 
  minWidth, 
  style,
  wrapperStyle,
  className = ''
}: BaseTabProps) {
  const minWidthClass = {
    space: 'min-w-[100px]',
    model: 'min-w-[120px]',
    actions: ''
  }[minWidth || 'actions']

  return (
    <div 
      className={`relative`}
      style={{
        ...wrapperStyle
      }}
    >
      <div
        onClick={onClick}
        className={`px-3 py-1.5 text-white text-xs font-medium flex items-center gap-1.5 relative overflow-hidden cursor-pointer ${minWidthClass}
           transition-all duration-300 group ${className}`}
        style={{
          ...style,
        }}
      >
        {icon && (
          <div className="relative z-10 text-white/60 group-hover:text-[#3ecfff]/80 transition-colors duration-300">
            {icon}
          </div>
        )}
        <span className="text-white/75 truncate relative z-10 group-hover:text-white/95 transition-colors duration-300">
          {label}
        </span>
        {shortcut && (
          <span className="text-white/60 text-[10px] ml-auto shrink-0 relative z-10">⌘{shortcut}</span>
        )}
      </div>
    </div>
  )
} 