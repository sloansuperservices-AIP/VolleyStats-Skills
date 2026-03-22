import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  trend?: { value: number; label: string }
  accentColor?: string
  className?: string
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  accentColor = 'text-sky-400',
  className,
}: StatCardProps) {
  return (
    <Card className={cn('hover:border-slate-700 transition-colors', className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              {title}
            </p>
            <div className="text-3xl font-bold text-slate-100">{value}</div>
            {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
          </div>
          <div className={cn('p-2.5 rounded-lg bg-slate-800/80', accentColor)}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        {trend && (
          <div className="mt-3 flex items-center gap-1 text-xs">
            <span
              className={
                trend.value >= 0 ? 'text-emerald-400' : 'text-red-400'
              }
            >
              {trend.value >= 0 ? '+' : ''}
              {trend.value}%
            </span>
            <span className="text-slate-500">{trend.label}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
