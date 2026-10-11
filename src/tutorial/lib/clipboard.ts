/**
 * Copy text to the clipboard, with a fallback for insecure contexts.
 *
 * `navigator.clipboard` only exists over https or on localhost, and a dev
 * server is routinely opened from another machine over the LAN
 * (`http://192.168.x.x:5173`), where it is undefined. The textarea trick
 * still works there, so the copy button is never dead in a demo.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    try {
      return document.execCommand('copy')
    } catch {
      return false
    } finally {
      ta.remove()
    }
  }
}
