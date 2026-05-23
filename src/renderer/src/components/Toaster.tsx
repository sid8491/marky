import { useToasts, type Toast, type ToastKind } from '@/store/toasts'
import { AnimatePresence, motion } from 'motion/react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'
import { cn } from '@/lib/cn'

const iconFor: Record<ToastKind, React.ReactNode> = {
  info: <Info className="size-4 text-accent" />,
  success: <CheckCircle2 className="size-4 text-emerald-500" />,
  error: <AlertCircle className="size-4 text-red-500" />
}

export function Toaster(): React.ReactElement {
  const items = useToasts((s) => s.items)
  const dismiss = useToasts((s) => s.dismiss)

  return (
    <div className="pointer-events-none fixed right-4 bottom-10 z-50 flex w-80 flex-col gap-2">
      <AnimatePresence initial={false}>
        {items.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </AnimatePresence>
    </div>
  )
}

function ToastItem({
  toast,
  onDismiss
}: {
  toast: Toast
  onDismiss: () => void
}): React.ReactElement {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.96, transition: { duration: 0.18 } }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      className={cn(
        'pointer-events-auto flex items-start gap-3 rounded-lg border border-subtle bg-elevated p-3 shadow-elevated'
      )}
    >
      <div className="mt-0.5">{iconFor[toast.kind ?? 'info']}</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-default">{toast.title}</div>
        {toast.description && (
          <div className="mt-0.5 text-xs text-muted">{toast.description}</div>
        )}
        {toast.actions && toast.actions.length > 0 && (
          <div className="mt-2 flex gap-2">
            {toast.actions.map((a, i) => (
              <button
                key={i}
                onClick={() => {
                  void a.onClick()
                  onDismiss()
                }}
                className="rounded-md bg-panel px-2 py-1 text-xs font-medium text-default hover:bg-surface transition-colors"
              >
                {a.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <button
        onClick={onDismiss}
        className="rounded p-0.5 text-faint hover:bg-panel hover:text-default transition-colors"
        aria-label="Dismiss"
      >
        <X className="size-3.5" />
      </button>
    </motion.div>
  )
}
