import { cn } from '@/lib/utils'

interface ColorCodedSectionProps {
  icon: string
  title: string
  headerClass: string
  children: React.ReactNode
  action?: React.ReactNode
  sticky?: boolean
}

export function ColorCodedSection({
  icon,
  title,
  headerClass,
  children,
  action,
  sticky,
}: ColorCodedSectionProps) {
  return (
    <section className="space-y-3">
      <div className={cn(
        'flex items-center justify-between',
        sticky && 'sticky top-0 bg-background py-2 z-10'
      )}>
        <h2 className={cn('text-base font-semibold flex items-center gap-2', headerClass)}>
          <span>{icon}</span>
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  )
}
