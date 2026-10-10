import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { world } from '../lib/world'

/* ------------------------------------------------------------------ *
 *  A response built from the shape of what you typed — not its meaning.
 *  There is no model here, and the panel says so. The point is that a
 *  deterministic function of your sentence can still feel like an answer.
 * ------------------------------------------------------------------ */

const OPEN = [
  'Somewhere in the weights,',
  'Across the hidden layers,',
  'Between two layers,',
  'In the space you cannot see,',
  'Along a path through the middle,',
]

const BODY = [
  'a shape like yours',
  'your sentence, folded',
  'something with your outline',
  'a pattern close to yours',
  'the echo of that phrasing',
]

const CLOSE = [
  'has been forming for a while.',
  'was already waiting.',
  'is now lit, faintly.',
  'answers back, quietly.',
  'bends toward the light.',
]

function hash32(s: string) {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

const PRESETS = [
  'hello',
  'what are you?',
  '从一粒沙开始',
  'remember me',
  'sing',
]

export function MindPanel() {
  const [text, setText] = useState('')
  const [answer, setAnswer] = useState('')
  const [meta, setMeta] = useState('')
  const [streaming, setStreaming] = useState(false)
  const timers = useRef<number[]>([])

  useEffect(
    () => () => {
      timers.current.forEach((t) => window.clearTimeout(t))
    },
    [],
  )

  const think = useCallback(
    (raw: string) => {
      const s = raw.trim()
      if (!s) return
      timers.current.forEach((t) => window.clearTimeout(t))
      timers.current = []

      const h = hash32(s)
      const line = `${OPEN[h % OPEN.length]} ${BODY[(h >>> 5) % BODY.length]} ${
        CLOSE[(h >>> 11) % CLOSE.length]
      }`

      // Drive the sculpture: how hard the thought hits, and its signature.
      world.thinkT = 0
      world.thinkOn = true
      world.thinkAmp = 0.55 + ((h >>> 3) % 100) / 100
      world.thinkSeed = (h % 1000) / 1000

      const bits = s.length * 8
      const layers = (h % 4) + 2
      setMeta(`${bits} bits · ${layers} layers lit · no model`)
      setAnswer('')
      setStreaming(true)

      // Stream it: an answer that appears all at once reads as a lookup.
      let i = 0
      const step = () => {
        i += 1 + ((h >>> i) % 2)
        setAnswer(line.slice(0, i))
        if (i < line.length) {
          timers.current.push(window.setTimeout(step, 26 + (i % 5) * 9))
        } else {
          setStreaming(false)
        }
      }
      timers.current.push(window.setTimeout(step, 220))
    },
    [],
  )

  return (
    <div data-r="extra" className="mt-[clamp(20px,3.4vh,42px)] flex w-full max-w-[min(720px,86vw)] flex-col items-center">
      <form
        className="group relative w-full"
        onSubmit={(e) => {
          e.preventDefault()
          think(text)
        }}
      >
        <div className="relative flex items-center gap-3 border-b border-[rgba(143,216,255,0.2)] pb-3 transition-colors duration-500 focus-within:border-[rgba(143,216,255,0.65)]">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={64}
            spellCheck={false}
            aria-label="Say something to the network"
            placeholder="say something to the network"
            className="min-w-0 flex-1 border-0 bg-transparent text-center text-[clamp(0.95rem,1.5vw,1.2rem)] font-light tracking-[0.02em] text-ink outline-none placeholder:text-[rgba(232,238,245,0.24)]"
          />
          <button
            type="submit"
            aria-label="Send"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[rgba(143,216,255,0.22)] text-[rgba(143,216,255,0.75)] transition-all duration-500 hover:border-[rgba(143,216,255,0.6)] hover:bg-[rgba(143,216,255,0.08)] hover:text-ice"
          >
            <ArrowRight size={14} />
          </button>
        </div>
        <span
          className="pointer-events-none absolute -bottom-px left-1/2 h-px w-0 -translate-x-1/2 bg-[linear-gradient(90deg,transparent,#8fd8ff,transparent)] transition-[width] duration-[900ms] ease-out group-focus-within:w-full"
          style={{ boxShadow: '0 0 12px rgba(143,216,255,0.8)' }}
        />
      </form>

      <div className="mt-3 flex flex-wrap justify-center gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => {
              setText(p)
              think(p)
            }}
            className="mono rounded-full border border-[rgba(232,238,245,0.1)] px-2.5 py-[3px] text-[9px] tracking-[0.14em] text-[rgba(232,238,245,0.42)] transition-colors duration-300 hover:border-[rgba(155,123,255,0.45)] hover:text-[rgba(196,178,255,0.95)]"
          >
            {p}
          </button>
        ))}
      </div>

      <div className="mt-[clamp(18px,2.8vh,34px)] flex min-h-[54px] w-full flex-col items-center justify-center">
        <p
          className="text-center text-[clamp(0.86rem,1.25vw,1.02rem)] leading-[1.7] font-light text-[rgba(232,238,245,0.84)]"
          style={{ textShadow: '0 0 30px rgba(74,43,184,0.45)' }}
        >
          {answer}
          {streaming ? <span className="ml-[2px] inline-block h-[1em] w-[2px] translate-y-[2px] bg-[rgba(155,123,255,0.9)]" /> : null}
        </p>
        {meta && !streaming ? (
          <span className="mono mt-2.5 text-[9px] tracking-[0.24em] text-[rgba(232,238,245,0.26)] uppercase">
            {meta}
          </span>
        ) : null}
      </div>
    </div>
  )
}
