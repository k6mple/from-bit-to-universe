import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { CornerDownLeft, Terminal as TerminalIcon } from 'lucide-react'
import { MemoryMap } from './MemoryMap'

/* ------------------------------------------------------------------ *
 *  A small, honest scheduler simulation
 * ------------------------------------------------------------------ */

type ProcState = 'RUN' | 'READY' | 'WAIT' | 'SLEEP'

interface Proc {
  pid: number
  name: string
  state: ProcState
  cpu: number
  mem: number
}

const SEED: [string, number][] = [
  ['init', 6],
  ['compositor', 34],
  ['net-stack', 12],
  ['indexer', 41],
  ['audio-engine', 18],
  ['ai-runtime', 88],
  ['page-cache', 7],
]

const STATE_STYLE: Record<ProcState, string> = {
  RUN: 'text-[#a9f0ff] border-[rgba(143,216,255,0.5)] bg-[rgba(143,216,255,0.1)]',
  READY: 'text-[rgba(232,238,245,0.62)] border-[rgba(232,238,245,0.16)] bg-transparent',
  WAIT: 'text-[rgba(155,123,255,0.8)] border-[rgba(155,123,255,0.32)] bg-[rgba(155,123,255,0.08)]',
  SLEEP: 'text-[rgba(232,238,245,0.26)] border-[rgba(232,238,245,0.08)] bg-transparent',
}

const QUANTA = 12

/* ------------------------------------------------------------------ *
 *  Panel chrome
 * ------------------------------------------------------------------ */

function Panel({
  title,
  meta,
  children,
  className = '',
}: {
  title: string
  meta?: string
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={`glass-soft relative flex min-h-0 flex-col overflow-hidden ${className}`}
    >
      <header className="flex shrink-0 items-center justify-between border-b border-[rgba(143,216,255,0.09)] px-3.5 py-2.5">
        <span className="mono text-[9px] tracking-[0.3em] text-[rgba(143,216,255,0.6)] uppercase">
          {title}
        </span>
        {meta ? (
          <span className="mono text-[9px] tracking-[0.18em] text-[rgba(232,238,245,0.32)] tabular-nums">
            {meta}
          </span>
        ) : null}
      </header>
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  )
}

/* ------------------------------------------------------------------ *
 *  Scheduler dial
 * ------------------------------------------------------------------ */

function Dial({ slot, quantum, runningPid }: { slot: number; quantum: number; runningPid: number }) {
  const R = 46
  const ticks = useMemo(() => Array.from({ length: QUANTA }, (_, i) => i), [])
  const frac = 1 - quantum / 12

  return (
    <div className="relative flex h-full items-center justify-center">
      <svg viewBox="-60 -60 120 120" className="h-[min(158px,20vh)] w-[min(158px,20vh)]">
        <circle r={R} fill="none" stroke="rgba(232,238,245,0.07)" strokeWidth="0.6" />
        <circle
          r={R - 7}
          fill="none"
          stroke="rgba(143,216,255,0.5)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={`${(R - 7) * 2 * Math.PI}`}
          strokeDashoffset={`${(R - 7) * 2 * Math.PI * frac}`}
          transform="rotate(-90)"
          style={{ filter: 'drop-shadow(0 0 5px rgba(143,216,255,0.75))' }}
        />
        {ticks.map((i) => {
          const a = (i / QUANTA) * Math.PI * 2 - Math.PI / 2
          const on = i === slot
          const r0 = R - 2
          const r1 = on ? R + 9 : R + 4
          return (
            <line
              key={i}
              x1={Math.cos(a) * r0}
              y1={Math.sin(a) * r0}
              x2={Math.cos(a) * r1}
              y2={Math.sin(a) * r1}
              stroke={on ? '#bdeaff' : 'rgba(232,238,245,0.2)'}
              strokeWidth={on ? 1.8 : 0.9}
              strokeLinecap="round"
              style={on ? { filter: 'drop-shadow(0 0 6px rgba(143,216,255,0.9))' } : undefined}
            />
          )
        })}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="mono text-[8px] tracking-[0.3em] text-[rgba(232,238,245,0.34)] uppercase">
          running
        </span>
        <span className="mono mt-1 text-[15px] tracking-[0.12em] text-ice tabular-nums">
          pid {String(runningPid).padStart(4, '0')}
        </span>
        <span className="mono mt-1 text-[8px] tracking-[0.26em] text-[rgba(155,123,255,0.7)] uppercase tabular-nums">
          quantum {quantum.toFixed(1)}ms
        </span>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ *
 *  Terminal
 * ------------------------------------------------------------------ */

interface Line {
  id: number
  kind: 'in' | 'out' | 'dim' | 'ok'
  text: string
}

const HELP: Line[] = [
  { id: -1, kind: 'dim', text: 'ps          list processes' },
  { id: -2, kind: 'dim', text: 'top         load overview' },
  { id: -3, kind: 'dim', text: 'mem         memory map report' },
  { id: -4, kind: 'dim', text: 'sched       how the scheduler decides' },
  { id: -5, kind: 'dim', text: 'fork        create a process' },
  { id: -6, kind: 'dim', text: 'kill <pid>  terminate a process' },
  { id: -7, kind: 'dim', text: 'stress      raise system load' },
  { id: -8, kind: 'dim', text: 'clear       clear the console' },
]

const CSS = 'rgba(143,216,255,0.85)'
const CSS_DIM = 'rgba(232,238,245,0.34)'

/* ------------------------------------------------------------------ *
 *  The panel
 * ------------------------------------------------------------------ */

export function KernelPanel() {
  const [procs, setProcs] = useState<Proc[]>(() =>
    SEED.map(([name, cpu], i) => ({
      pid: 1000 + i * 37,
      name,
      state: 'READY' as ProcState,
      cpu,
      mem: 40 + Math.round(Math.random() * 320),
    })),
  )
  const [slot, setSlot] = useState(0)
  const [quantum, setQuantum] = useState(12)
  const [load, setLoad] = useState(0.42)
  const [lines, setLines] = useState<Line[]>([
    { id: 0, kind: 'dim', text: 'kernel 6.9.0-universe  ·  type "help"' },
    {
      id: -100,
      kind: 'out',
      text: 'thousands of processes want the same processor at the same instant.',
    },
    { id: -101, kind: 'out', text: 'something has to decide — and it decides a million times a second.' },
  ])
  const [input, setInput] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const [histIdx, setHistIdx] = useState(-1)
  const lineId = useRef(1)
  const outRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const running = procs.find((p) => p.state === 'RUN') ?? procs[0]

  /* --- scheduler heartbeat ---------------------------------------- */
  useEffect(() => {
    const id = window.setInterval(() => {
      setQuantum((q) => {
        const nq = q - 1.15
        if (nq <= 0) {
          setSlot((s) => (s + 1) % QUANTA)
          return 12
        }
        return nq
      })
      setLoad((l) => Math.max(0.12, Math.min(0.98, l + (Math.random() - 0.5) * 0.09)))
      setProcs((ps) => {
        const next = ps.map((p) => ({ ...p }))
        const total = next.reduce((a, p) => a + p.cpu, 0) || 1
        const runningIdx = Math.floor(Math.random() * next.length)
        next.forEach((p, i) => {
          p.cpu = Math.max(2, Math.min(97, p.cpu + (Math.random() - 0.5) * 22))
          p.state = i === runningIdx ? 'RUN' : p.cpu > 78 ? 'WAIT' : Math.random() < 0.22 ? 'SLEEP' : 'READY'
        })
        // Keep the displayed numbers coherent with the load average.
        const scale = (load * 100 * next.length) / total
        next.forEach((p) => (p.cpu = Math.min(99, p.cpu * Math.max(0.4, scale))))
        return next
      })
    }, 420)
    return () => window.clearInterval(id)
  }, [load])

  /* --- output helpers --------------------------------------------- */
  const push = useCallback((items: Omit<Line, 'id'>[]) => {
    setLines((ls) => {
      const next = [...ls, ...items.map((t) => ({ ...t, id: lineId.current++ }))]
      return next.slice(-14)
    })
  }, [])

  const run = useCallback(
    (raw: string) => {
      const cmd = raw.trim()
      if (!cmd) return
      setHistory((h) => [...h, cmd])
      setHistIdx(-1)
      push([{ kind: 'in', text: cmd }])

      const [head, arg] = cmd.split(/\s+/)
      switch (head) {
        case 'help':
          push(HELP.map(({ kind, text }) => ({ kind, text })))
          break
        case 'clear':
          setLines([{ id: lineId.current++, kind: 'dim', text: 'console cleared' }])
          break
        case 'ps':
          push([
            { kind: 'out', text: '  PID   STATE   CPU   COMMAND' },
            ...procs.map((p) => ({
              kind: 'out' as const,
              text: `${String(p.pid).padStart(5)}   ${p.state.padEnd(6)} ${p.cpu
                .toFixed(1)
                .padStart(5)}   ${p.name}`,
            })),
          ])
          break
        case 'top':
          push([
            { kind: 'out', text: `load average   ${load.toFixed(2)}  ${(load * 0.94).toFixed(2)}  ${(load * 0.87).toFixed(2)}` },
            { kind: 'out', text: `running        ${running?.name ?? '—'} (pid ${running?.pid ?? 0})` },
            { kind: 'ok', text: `${procs.length} processes · ${(procs.length * 5 + 41)} threads` },
          ])
          break
        case 'mem':
          push([
            { kind: 'out', text: 'total   32.0 GB      used    11.4 GB' },
            { kind: 'out', text: 'cached   9.1 GB      free     2.3 GB' },
            { kind: 'ok', text: 'every page accounted for — nothing is lost' },
          ])
          break
        case 'sched':
          push([
            { kind: 'out', text: 'policy   CFS · 12ms target latency' },
            { kind: 'out', text: 'ready queue is ordered by virtual runtime' },
            { kind: 'ok', text: 'the process that has waited longest runs next' },
          ])
          break
        case 'fork': {
          push([{ kind: 'ok', text: `fork() → new process, pid ${2000 + procs.length * 13}` }])
          setProcs((ps) => [
            ...ps.slice(-11),
            {
              pid: 2000 + ps.length * 13,
              name: `worker-${(ps.length * 7) % 97}`,
              state: 'READY',
              cpu: 20 + Math.random() * 40,
              mem: 60 + Math.random() * 260,
            },
          ])
          break
        }
        case 'kill': {
          const pid = parseInt(arg ?? '', 10)
          if (!pid || !procs.some((p) => p.pid === pid)) {
            push([{ kind: 'dim', text: `no such process: ${arg ?? ''}` }])
          } else {
            setProcs((ps) => ps.filter((p) => p.pid !== pid))
            push([{ kind: 'ok', text: `SIGTERM → ${pid} exited cleanly` }])
          }
          break
        }
        case 'stress':
          setLoad(0.94)
          setProcs((ps) => ps.map((p) => ({ ...p, cpu: Math.min(99, p.cpu + 34) })))
          push([{ kind: 'ok', text: 'load raised — watch the queues absorb it' }])
          break
        default:
          push([{ kind: 'dim', text: `${head}: command not found. try "help".` }])
      }
    },
    [procs, running, load, push],
  )

  useEffect(() => {
    const el = outRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [lines])

  const presets = ['ps', 'top', 'sched', 'mem', 'fork', 'stress']

  return (
    <div className="flex w-full flex-col gap-px">
      <div className="grid grid-cols-1 gap-px lg:grid-cols-[minmax(0,0.92fr)_minmax(0,0.86fr)_minmax(0,1.1fr)]">
        {/* ---- processes ---- */}
        <Panel title="Processes" meta={`${procs.length} live`}>
          <ul className="divide-y divide-[rgba(232,238,245,0.05)]">
            {procs.slice(0, 7).map((p) => (
              <li
                key={p.pid}
                className="grid grid-cols-[1fr_auto] items-center gap-2 px-3.5 py-[7px] transition-colors duration-500"
              >
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="mono text-[10px] text-[rgba(232,238,245,0.35)] tabular-nums">
                      {p.pid}
                    </span>
                    <span className="truncate text-[11.5px] font-normal text-[rgba(232,238,245,0.82)]">
                      {p.name}
                    </span>
                  </div>
                  <div className="mt-1.5 h-[2px] w-full overflow-hidden bg-[rgba(232,238,245,0.07)]">
                    <div
                      className="h-full origin-left transition-[width] duration-500 ease-out"
                      style={{
                        width: `${p.cpu}%`,
                        background:
                          p.state === 'RUN'
                            ? 'linear-gradient(90deg,#2e7dd1,#c9ecff)'
                            : 'linear-gradient(90deg,rgba(74,127,168,0.55),rgba(143,216,255,0.6))',
                        boxShadow: p.state === 'RUN' ? '0 0 8px rgba(143,216,255,0.6)' : 'none',
                      }}
                    />
                  </div>
                </div>
                <span
                  className={`mono rounded-[3px] border px-1.5 py-[3px] text-[8px] tracking-[0.18em] transition-colors duration-500 ${STATE_STYLE[p.state]}`}
                >
                  {p.state}
                </span>
              </li>
            ))}
          </ul>
        </Panel>

        {/* ---- scheduler ---- */}
        <Panel title="Scheduler" meta={`load ${load.toFixed(2)}`} className="hidden lg:flex">
          <Dial slot={slot} quantum={quantum} runningPid={running?.pid ?? 0} />
        </Panel>

        {/* ---- memory ---- */}
        <Panel title="Physical memory" meta="32.0 GB · 4K pages" className="hidden lg:flex">
          {/* flex-1 inside a stretched grid item gives this a *definite*
              height, which is what keeps the canvas out of the layout loop. */}
          <div className="relative min-h-[170px] flex-1 p-3">
            <MemoryMap />
          </div>
          <div className="mono flex shrink-0 items-center gap-4 border-t border-[rgba(143,216,255,0.09)] px-3.5 py-2 text-[8.5px] tracking-[0.2em] text-[rgba(232,238,245,0.3)] uppercase">
            <span className="flex items-center gap-1.5">
              <i className="inline-block h-[6px] w-[6px] bg-[rgba(155,123,255,0.75)]" /> kernel
            </span>
            <span className="flex items-center gap-1.5">
              <i className="inline-block h-[6px] w-[6px] bg-[rgba(120,190,255,0.85)]" /> user
            </span>
            <span className="flex items-center gap-1.5">
              <i className="inline-block h-[6px] w-[6px] bg-[rgba(232,238,245,0.12)]" /> free
            </span>
          </div>
        </Panel>
      </div>

      {/* ---- terminal ---- */}
      <Panel title="Console" meta="tty1">
        <div className="flex flex-col">
          <div
            ref={outRef}
            className="term-scroll h-[clamp(104px,13vh,146px)] overflow-hidden px-3.5 py-2.5"
          >
            {lines.map((l) => (
              <div
                key={l.id}
                className="mono text-[11px] leading-[1.72] whitespace-pre-wrap"
                style={{
                  color:
                    l.kind === 'in'
                      ? CSS
                      : l.kind === 'ok'
                        ? 'rgba(169,240,255,0.92)'
                        : l.kind === 'out'
                          ? 'rgba(232,238,245,0.62)'
                          : CSS_DIM,
                }}
              >
                {l.kind === 'in' ? <span style={{ color: CSS_DIM }}>❯ </span> : null}
                {l.text}
              </div>
            ))}
          </div>

          <form
            className="flex items-center gap-2 border-t border-[rgba(143,216,255,0.09)] px-3.5 py-2.5"
            onSubmit={(e) => {
              e.preventDefault()
              run(input)
              setInput('')
            }}
          >
            <TerminalIcon size={12} className="shrink-0 text-[rgba(143,216,255,0.55)]" />
            <span className="mono text-[11px]" style={{ color: CSS }}>
              ❯
            </span>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowUp') {
                  e.preventDefault()
                  const i = histIdx < 0 ? history.length - 1 : Math.max(0, histIdx - 1)
                  if (history[i] !== undefined) {
                    setHistIdx(i)
                    setInput(history[i])
                  }
                } else if (e.key === 'ArrowDown') {
                  e.preventDefault()
                  const i = histIdx + 1
                  if (i >= history.length) {
                    setHistIdx(-1)
                    setInput('')
                  } else {
                    setHistIdx(i)
                    setInput(history[i])
                  }
                }
              }}
              spellCheck={false}
              autoComplete="off"
              aria-label="Kernel console input"
              placeholder="type a command…"
              className="mono min-w-0 flex-1 border-0 bg-transparent text-[11.5px] text-ink outline-none placeholder:text-[rgba(232,238,245,0.24)]"
            />
            <button
              type="submit"
              className="mono flex shrink-0 items-center gap-1.5 rounded-[3px] border border-[rgba(143,216,255,0.2)] px-2 py-1 text-[9px] tracking-[0.18em] text-[rgba(143,216,255,0.72)] uppercase transition-colors duration-300 hover:border-[rgba(143,216,255,0.5)] hover:text-ice"
            >
              <CornerDownLeft size={10} />
              run
            </button>
          </form>

          <div className="flex flex-wrap gap-1.5 border-t border-[rgba(143,216,255,0.07)] px-3.5 py-2.5">
            {presets.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => run(p)}
                className="mono rounded-full border border-[rgba(143,216,255,0.14)] px-2.5 py-[3px] text-[9px] tracking-[0.16em] text-[rgba(143,216,255,0.62)] uppercase transition-colors duration-300 hover:border-[rgba(143,216,255,0.45)] hover:bg-[rgba(143,216,255,0.07)] hover:text-ice"
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </Panel>
    </div>
  )
}
