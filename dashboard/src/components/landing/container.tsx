'use client'

import { cn } from '@/lib/utils'

interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  className?: string
}

export function Container({ children, className, ...props }: ContainerProps) {
  return (
    <div className={cn('mx-auto w-full max-w-6xl px-6', className)} {...props}>
      {children}
    </div>
  )
}
