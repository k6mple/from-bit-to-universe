/**
 * Chinese has no word spaces, so a line break can land anywhere — which means
 * a headline that fits by accident will still break by accident, mid-phrase,
 * at whatever character happens to reach the margin. Chinese display type sets
 * its own break at the comma, where the sentence already pauses.
 *
 * Kept in the type layer rather than the copy so the source text stays a
 * single clean sentence.
 */
export function cjkLines(text: string): string[] {
  const comma = text.indexOf('，')
  if (text.length > 9 && comma > 0) {
    return [text.slice(0, comma + 1), text.slice(comma + 1)]
  }
  return [text]
}

/** The Chinese headline: one masked line per clause, stacked as blocks. */
export function CjkHeadline({ text }: { text: string }) {
  return (
    <>
      {cjkLines(text).map((line, i) => (
        <span key={i} className="block">
          <span className="mask">
            <span className="mask-i">{line}</span>
          </span>
        </span>
      ))}
    </>
  )
}
