import { ReactNode } from 'react'

interface BaseTabProps {
  icon?: ReactNode
  label: string
  shortcut?: string
  onClick?: () => void
  minWidth?: 'space' | 'model' | 'actions'
  roundedBottom?: boolean
}

export function BaseTab({ icon, label, shortcut, onClick, minWidth, roundedBottom = false }: BaseTabProps) {
  const minWidthClass = {
    space: 'min-w-[100px]',
    model: 'min-w-[120px]',
    actions: ''
  }[minWidth || 'actions']

  return (
    <div
      onClick={onClick}
      className={`px-3 py-1.5 text-white text-xs font-medium flex items-center gap-1.5 relative overflow-hidden cursor-pointer ${minWidthClass}
         transition-all duration-300 group`}
    >
      <div className="absolute inset-0 bg-[#3ecfff]/[0.02] opacity-0 group-hover:opacity-100 transition-all duration-300" />
      {icon && (
        <div className="relative z-10 text-white/60 group-hover:text-[#3ecfff] transition-colors duration-300 group-hover:shadow-[0_0_8px_rgba(62,207,255,0.3)]">
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
  )
} 