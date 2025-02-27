 'use client'

import { QuickActionsCommandProvider } from '@/components/ui/quick-actions-command-provider'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QuickActionsCommandProvider>
      {children}
    </QuickActionsCommandProvider>
  )
}