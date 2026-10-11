import { useEffect, useRef, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { copyText } from '../lib/clipboard'

/* ------------------------------------------------------------------ *
 *  CommandBlock — a shell command the reader is meant to run.
 *
 *    <CommandBlock lines={['npm install', 'npm run dev']} />
 *
 *    <CommandBlock lang="powershell">{`
 *      # a line starting with # renders as a muted comment
 *      Get-ChildItem
 *    `}</CommandBlock>
 *
 *  The copy button writes the commands and nothing else: no language
 *  label, no chrome. There is deliberately no `$` prompt in the block
 *  either — a prompt glyph is one careless drag-select away from being
 *  pasted into someone's shell.
 * ------------------------------------------------------------------ */

/** Only a label in the header. The block never parses the command. */
export type CommandLang = 'bash' | 'powershell' | 'cmd' | 'shell' | 'sh' | 'zsh' | (string & {})

/** Removes the indent every line shares, so template literals can breathe. */
function dedent(text: string): string {
  const rows = text.replace(/^\n+|\s+$/g, '').split('\n')
  const indents = rows.filter((r) => r.trim()).map((r) => r.length - r.trimStart().length)
  const cut = indents.length ? Math.min(...indents) : 0
  return rows.map((r) => r.slice(cut)).join('\n')
}

/* ------------------------------------------------------------------ *
 *  Colour.
 *
 *  Three roles, not a syntax highlighter: the program, its options, and
 *  everything else. That is what a reader scanning for "what am I about
 *  to run, and with what" actually needs, and it keeps the block to two
 *  hues — the page accent and the page amber.
 * ------------------------------------------------------------------ */

type Role = 'cmd' | 'flag' | 'arg' | 'comment'

const ROLE_CLASS: Record<Role, string> = {
  cmd: 'text-[color:var(--tut-cmd)]',
  flag: 'text-[color:var(--tut-flag)]',
  arg: 'text-[color:var(--tut-code)]',
  comment: 'text-[color:var(--tut-faint)]',
}

/**
 * Splits one line into coloured runs. It only ever *slices* the line, so
 * what is drawn is character-for-character what was typed — and the copy
 * button pastes the original string anyway, never the DOM.
 *
 *   ^program   -f --flag (and /flag under cmd)   # comment, to end of line
 */
function tokenize(line: string, lang: CommandLang): { text: string; role: Role }[] {
  // ` #` starts a comment; a `#` inside a word (a URL fragment) does not.
  const hash = /(^|\s)#/.exec(line)
  const cut = hash ? hash.index + hash[1].length : -1

  const code = cut === -1 ? line : line.slice(0, cut)
  const runs: { text: string; role: Role }[] = []
  let first = true

  for (const part of code.split(/(\s+)/)) {
    if (!part) continue
    if (/^\s+$/.test(part)) {
      runs.push({ text: part, role: 'arg' })
      continue
    }
    // `/flag` is cmd's spelling; under bash that leading slash is a path.
    const flag = part.startsWith('-') || (lang === 'cmd' && part.startsWith('/'))
    runs.push({ text: part, role: first ? 'cmd' : flag ? 'flag' : 'arg' })
    first = false
  }

  if (cut !== -1) runs.push({ text: line.slice(cut), role: 'comment' })
  return runs
}

export function CommandBlock({
  children,
  lines,
  lang = 'bash',
}: {
  /** The command, as a template literal. */
  children?: string
  /** …or one array entry per line. */
  lines?: string[]
  /** Header label: bash, powershell, cmd. Cosmetic — never copied. */
  lang?: CommandLang
}) {
  const [copied, setCopied] = useState(false)
  const timer = useRef(0)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const command = dedent(lines ? lines.join('\n') : (children ?? ''))

  const onCopy = async () => {
    if (!(await copyText(command))) return
    setCopied(true)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className="my-6 overflow-hidden rounded-[10px] border border-[color:var(--tut-line)] bg-[color:var(--tut-surface)]">
      <div className="flex items-center justify-between gap-4 border-b border-[color:var(--tut-line-soft)] py-1.5 pr-1.5 pl-4">
        <span className="mono text-[10px] tracking-[0.18em] text-[color:var(--tut-faint)] uppercase select-none">
          {lang}
        </span>

        <button
          type="button"
          onClick={onCopy}
          aria-label="复制命令"
          className="mono flex min-w-[72px] cursor-pointer items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] text-[color:var(--tut-muted)] transition-colors duration-200 hover:bg-white/5 hover:text-[color:var(--tut-heading)]"
        >
          {copied ? (
            <Check size={12} strokeWidth={2.5} aria-hidden />
          ) : (
            <Copy size={12} strokeWidth={2} aria-hidden />
          )}
          {copied ? '已复制' : '复制'}
        </button>
      </div>

      {/* Long commands scroll sideways rather than wrapping — a wrapped
          command is one you cannot safely copy by eye. */}
      <pre className="tut-scroll overflow-x-auto px-4 py-3.5">
        <code className="mono block text-[13px] leading-[1.85]">
          {command.split('\n').map((line, i) => {
            const runs = tokenize(line, lang)
            return (
              <span key={i} className="block whitespace-pre">
                {runs.length === 0
                  ? ' '
                  : runs.map((run, j) => (
                      <span key={j} className={ROLE_CLASS[run.role]}>
                        {run.text}
                      </span>
                    ))}
              </span>
            )
          })}
        </code>
      </pre>

      <span role="status" aria-live="polite" className="sr-only">
        {copied ? '命令已复制' : ''}
      </span>
    </div>
  )
}
