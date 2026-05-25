import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { X, Check, AlertTriangle, Trash2, Loader2, Download } from 'lucide-react'
import { useAi } from '@/store/ai'
import { useSettings } from '@/store/settings'
import { useUpdateStatus, type UpdatePhase } from '@/store/updateStatus'
import { toast } from '@/store/toasts'
import { manualCheckForUpdates } from '@/hooks/useUpdates'
import { cn } from '@/lib/cn'
import type { AIProvider } from '@shared/ai'
import type { PdfMarginPreset, PdfPageSize } from '@shared/types'

const PROVIDER_LABELS: Record<AIProvider, string> = {
  anthropic: 'Anthropic (Claude)',
  openai: 'OpenAI (GPT)',
  google: 'Google (Gemini)',
  ollama: 'Ollama (local)'
}

const PROVIDER_HINTS: Record<AIProvider, string> = {
  anthropic: 'console.anthropic.com → API keys',
  openai: 'platform.openai.com → API keys',
  google: 'aistudio.google.com → Get API key',
  ollama: 'No API key — uses your local Ollama instance'
}

export function SettingsModal(): React.ReactElement {
  const open = useAi((s) => s.open)
  const close = useAi((s) => s.closeSettings)
  const settings = useAi((s) => s.settings)
  const load = useAi((s) => s.load)
  const setProvider = useAi((s) => s.setProvider)
  const setModel = useAi((s) => s.setModel)
  const setTemperature = useAi((s) => s.setTemperature)
  const setGhostText = useAi((s) => s.setGhostText)
  const setOllamaUrl = useAi((s) => s.setOllamaUrl)
  const saveKey = useAi((s) => s.saveKey)
  const removeKey = useAi((s) => s.removeKey)
  const test = useAi((s) => s.test)

  useEffect(() => {
    if (!settings) void load()
  }, [settings, load])

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const mod = e.ctrlKey || e.metaKey
      if (mod && e.key === ',') {
        e.preventDefault()
        useAi.getState().openSettings()
      } else if (e.key === 'Escape' && open) {
        close()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, close])

  return (
    <AnimatePresence>
      {open && settings && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close()
          }}
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className="w-full max-w-2xl overflow-hidden rounded-xl border border-strong bg-elevated shadow-elevated"
          >
            <header className="flex items-center justify-between border-b border-subtle px-5 py-3">
              <h2 className="text-sm font-semibold text-default">Settings</h2>
              <button
                onClick={close}
                className="rounded p-1 text-faint hover:bg-panel hover:text-default transition-colors"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </header>

            <div className="max-h-[70vh] overflow-y-auto p-5">
              <AboutSection />

              <PdfExportSection />

              <Section title="AI provider">
                <Field label="Active provider">
                  <Select
                    value={settings.provider}
                    onChange={(v) => void setProvider(v as AIProvider)}
                    options={(Object.keys(PROVIDER_LABELS) as AIProvider[]).map((p) => ({
                      value: p,
                      label: PROVIDER_LABELS[p]
                    }))}
                  />
                </Field>
                <Field label={`Model · ${PROVIDER_LABELS[settings.provider]}`}>
                  <input
                    value={settings.models[settings.provider]}
                    onChange={(e) => void setModel(settings.provider, e.target.value)}
                    className="w-full rounded-md border border-subtle bg-panel px-3 py-1.5 text-sm focus:border-strong focus:outline-none"
                    placeholder="model name"
                  />
                </Field>
                <Field label="Temperature">
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={settings.temperature}
                      onChange={(e) => void setTemperature(parseFloat(e.target.value))}
                      className="flex-1 accent-accent"
                    />
                    <span className="w-10 text-right font-mono text-xs text-muted">
                      {settings.temperature.toFixed(2)}
                    </span>
                  </div>
                </Field>
                <Field label="Auto-suggest as I type">
                  <Toggle
                    checked={settings.ghostTextEnabled}
                    onChange={(v) => void setGhostText(v)}
                    description="When on, an AI continuation appears as gray ghost-text after you pause typing. Press Tab to accept, Esc to dismiss. Off by default — use Ctrl+J or the command palette to request a suggestion manually."
                  />
                </Field>
              </Section>

              <Section title="API keys">
                <p className="mb-3 text-xs text-faint">
                  Keys are encrypted with your OS keychain (DPAPI / Keychain / libsecret)
                  — they never leave your machine and the renderer never sees them.
                </p>
                {(Object.keys(PROVIDER_LABELS) as AIProvider[]).map((p) => (
                  <KeyRow
                    key={p}
                    provider={p}
                    keySet={settings.keys[p]}
                    onSave={(v) => saveKey(p, v)}
                    onRemove={() => removeKey(p)}
                    onTest={() => test(p)}
                  />
                ))}
              </Section>

              <Section title="Ollama">
                <Field label="Server URL">
                  <input
                    value={settings.ollamaUrl}
                    onChange={(e) => void setOllamaUrl(e.target.value)}
                    className="w-full rounded-md border border-subtle bg-panel px-3 py-1.5 text-sm focus:border-strong focus:outline-none"
                    placeholder="http://localhost:11434"
                  />
                </Field>
              </Section>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function AboutSection(): React.ReactElement {
  const [version, setVersion] = useState<string | null>(null)
  const [clickedCheck, setClickedCheck] = useState(false)
  const phase = useUpdateStatus((s) => s.phase)
  const percent = useUpdateStatus((s) => s.percent)
  const updateVersion = useUpdateStatus((s) => s.version)
  const errorMessage = useUpdateStatus((s) => s.errorMessage)

  useEffect(() => {
    void window.marky.appVersion().then(setVersion)
  }, [])

  const handleCheck = (): void => {
    setClickedCheck(true)
    manualCheckForUpdates()
    // The toast lifecycle handles the result; clear the local spinner shortly
    // after the request fires so the button stops looking pending if the main
    // process is silent. The store-driven status line takes over from here.
    setTimeout(() => setClickedCheck(false), 1500)
  }

  const handleRestart = (): void => window.marky.updates.install()

  const busy = clickedCheck || phase === 'checking' || phase === 'downloading'

  return (
    <section className="mb-6">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-faint">
        About
      </h3>
      <div className="rounded-lg border border-subtle bg-panel/50 p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-medium text-default">Marky</div>
            <div className="mt-0.5 font-mono text-xs text-faint">
              {version ? `v${version}` : 'loading…'}
            </div>
          </div>
          {phase === 'downloaded' ? (
            <button
              onClick={handleRestart}
              className="flex items-center gap-2 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:opacity-90"
            >
              <Download className="size-3.5" />
              Restart to install
            </button>
          ) : (
            <button
              onClick={handleCheck}
              disabled={busy}
              className="flex items-center gap-2 rounded-md border border-strong bg-elevated px-3 py-1.5 text-xs font-medium text-default transition-colors hover:bg-panel disabled:opacity-60"
            >
              {busy ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Download className="size-3.5" />
              )}
              Check for updates
            </button>
          )}
        </div>
        <UpdateStatusLine
          phase={phase}
          percent={percent}
          version={updateVersion}
          errorMessage={errorMessage}
        />
      </div>
    </section>
  )
}

function UpdateStatusLine({
  phase,
  percent,
  version,
  errorMessage
}: {
  phase: UpdatePhase
  percent: number
  version: string | null
  errorMessage: string | null
}): React.ReactElement | null {
  if (phase === 'idle' || phase === 'not-available') return null

  if (phase === 'checking') {
    return <StatusRow tone="muted">Checking for updates…</StatusRow>
  }

  if (phase === 'available') {
    return (
      <StatusRow tone="muted">v{version} is available — download starting…</StatusRow>
    )
  }

  if (phase === 'downloading') {
    const clamped = Math.max(0, Math.min(100, Math.round(percent)))
    return (
      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="text-muted">Downloading{version ? ` v${version}` : ''}…</span>
          <span className="font-mono text-faint">{clamped}%</span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={clamped}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Update download progress"
          className="h-1.5 w-full overflow-hidden rounded-full bg-elevated"
        >
          <div
            className="h-full bg-accent transition-[width] duration-150 ease-out"
            style={{ width: `${clamped}%` }}
          />
        </div>
      </div>
    )
  }

  if (phase === 'downloaded') {
    return (
      <StatusRow tone="accent">v{version} is downloaded and ready to install.</StatusRow>
    )
  }

  // phase === 'error'
  return (
    <StatusRow tone="error">Update failed: {errorMessage ?? 'unknown error'}</StatusRow>
  )
}

function StatusRow({
  tone,
  children
}: {
  tone: 'muted' | 'accent' | 'error'
  children: React.ReactNode
}): React.ReactElement {
  return (
    <div
      className={cn(
        'mt-3 text-xs',
        tone === 'muted' && 'text-muted',
        tone === 'accent' && 'text-accent',
        tone === 'error' && 'text-red-500'
      )}
    >
      {children}
    </div>
  )
}

const PAGE_SIZE_OPTIONS: { value: PdfPageSize; label: string }[] = [
  { value: 'A4', label: 'A4 (210 × 297 mm)' },
  { value: 'Letter', label: 'Letter (8.5 × 11 in)' },
  { value: 'Legal', label: 'Legal (8.5 × 14 in)' },
  { value: 'A3', label: 'A3 (297 × 420 mm)' },
  { value: 'A5', label: 'A5 (148 × 210 mm)' },
  { value: 'Tabloid', label: 'Tabloid (11 × 17 in)' }
]

const MARGIN_OPTIONS: { value: PdfMarginPreset; label: string }[] = [
  { value: 'default', label: 'Default (0.6 in)' },
  { value: 'narrow', label: 'Narrow (0.3 in)' },
  { value: 'none', label: 'None (0 in)' }
]

function PdfExportSection(): React.ReactElement {
  const pdf = useSettings((s) => s.pdf)
  const setPdf = useSettings((s) => s.setPdf)

  return (
    <Section title="PDF export">
      <Field label="Page size">
        <Select
          value={pdf.pageSize}
          onChange={(v) => setPdf({ pageSize: v as PdfPageSize })}
          options={PAGE_SIZE_OPTIONS}
        />
      </Field>
      <Field label="Margins">
        <Select
          value={pdf.margins}
          onChange={(v) => setPdf({ margins: v as PdfMarginPreset })}
          options={MARGIN_OPTIONS}
        />
      </Field>
      <Field label="Landscape orientation">
        <Toggle checked={pdf.landscape} onChange={(v) => setPdf({ landscape: v })} />
      </Field>
      <Field label="Print background">
        <Toggle
          checked={pdf.printBackground}
          onChange={(v) => setPdf({ printBackground: v })}
          description="Include page background colour in the export. Turn off for a plain white background."
        />
      </Field>
      <Field label="Page numbers">
        <Toggle
          checked={pdf.displayPageNumbers}
          onChange={(v) => setPdf({ displayPageNumbers: v })}
          description="Show 'X / Y' centred at the foot of each page. Forces a minimum 0.5 in vertical margin so the footer doesn't overlap content."
        />
      </Field>
    </Section>
  )
}

function Section({
  title,
  children
}: {
  title: string
  children: React.ReactNode
}): React.ReactElement {
  return (
    <section className="mb-6 last:mb-0">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-faint">
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

function Field({
  label,
  children
}: {
  label: string
  children: React.ReactNode
}): React.ReactElement {
  return (
    <div>
      <label className="mb-1 block text-xs text-muted">{label}</label>
      {children}
    </div>
  )
}

function Select({
  value,
  onChange,
  options
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}): React.ReactElement {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-md border border-subtle bg-panel px-3 py-1.5 text-sm focus:border-strong focus:outline-none"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

function Toggle({
  checked,
  onChange,
  description
}: {
  checked: boolean
  onChange: (v: boolean) => void
  description?: string
}): React.ReactElement {
  return (
    <div className="flex items-start gap-3">
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors',
          checked ? 'bg-accent' : 'bg-panel border border-subtle'
        )}
      >
        <span
          className={cn(
            'inline-block size-4 transform rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-4' : 'translate-x-0.5'
          )}
        />
      </button>
      {description && <span className="text-xs text-muted">{description}</span>}
    </div>
  )
}

function KeyRow({
  provider,
  keySet,
  onSave,
  onRemove,
  onTest
}: {
  provider: AIProvider
  keySet: boolean
  onSave: (v: string) => Promise<void>
  onRemove: () => Promise<void>
  onTest: () => Promise<{ ok: boolean; error?: string }>
}): React.ReactElement {
  const [input, setInput] = useState('')
  const [editingOverride, setEditingOverride] = useState(false)
  const [testing, setTesting] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)

  // Show the input when either the user clicked "Replace" or no key is set yet.
  const editing = editingOverride || !keySet

  const isOllama = provider === 'ollama'

  const handleSave = async (): Promise<void> => {
    if (!input.trim()) return
    await onSave(input.trim())
    setInput('')
    setEditingOverride(false)
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 1500)
  }

  const handleTest = async (): Promise<void> => {
    setTesting(true)
    try {
      const res = await onTest()
      if (res.ok) {
        toast(`${PROVIDER_LABELS[provider]} connected`, { kind: 'success' })
      } else {
        toast(`${PROVIDER_LABELS[provider]} test failed`, {
          description: res.error,
          kind: 'error',
          duration: 6000
        })
      }
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="rounded-lg border border-subtle bg-panel/50 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-default">
              {PROVIDER_LABELS[provider]}
            </span>
            {!isOllama && keySet && !editing && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-500">
                <Check className="size-3" />
                key set
              </span>
            )}
            {savedFlash && <span className="text-xs text-accent">saved</span>}
          </div>
          <div className="mt-0.5 text-xs text-faint">{PROVIDER_HINTS[provider]}</div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => void handleTest()}
            disabled={testing}
            className="rounded-md px-2 py-1 text-xs text-muted hover:bg-elevated hover:text-default disabled:opacity-50"
          >
            {testing ? (
              <span className="inline-flex items-center gap-1">
                <Loader2 className="size-3 animate-spin" />
                Testing…
              </span>
            ) : (
              'Test'
            )}
          </button>
          {!isOllama && keySet && !editing && (
            <>
              <button
                onClick={() => setEditingOverride(true)}
                className="rounded-md px-2 py-1 text-xs text-muted hover:bg-elevated hover:text-default"
              >
                Replace
              </button>
              <button
                onClick={() => void onRemove()}
                className="rounded-md p-1 text-faint hover:bg-elevated hover:text-red-500"
                title="Remove key"
              >
                <Trash2 className="size-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
      {!isOllama && editing && (
        <div className="mt-3 flex gap-2">
          <input
            type="password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste API key…"
            className="flex-1 rounded-md border border-subtle bg-elevated px-3 py-1.5 font-mono text-xs focus:border-strong focus:outline-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleSave()
            }}
          />
          <button
            onClick={() => void handleSave()}
            disabled={!input.trim()}
            className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
          >
            Save
          </button>
          {keySet && (
            <button
              onClick={() => {
                setEditingOverride(false)
                setInput('')
              }}
              className="rounded-md px-3 py-1.5 text-xs text-muted hover:bg-elevated hover:text-default"
            >
              Cancel
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// re-export for label lookups
export { PROVIDER_LABELS }
// suppress unused (used in keyrow)
void AlertTriangle
