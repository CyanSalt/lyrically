export function getHashCode(str: string) {
  let hash = 0
  for (let i = 0, len = str.length; i < len; i++) {
    const chr = str.charCodeAt(i)
    // eslint-disable-next-line no-bitwise
    hash = ((hash << 5) - hash) + chr
    // eslint-disable-next-line no-bitwise
    hash |= 0
  }
  return hash
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export function LCG(seed: number) {
  return () => {
    seed = Math.imul(48271, seed)
    // eslint-disable-next-line no-bitwise
    return (2 ** 31 - 1 & seed) / 2 ** 31
  }
}

let element: HTMLElement | undefined
export function getPlainText(html: string) {
  if (!element) element = document.createElement('div')
  element.innerHTML = html
  return element.textContent!
}
