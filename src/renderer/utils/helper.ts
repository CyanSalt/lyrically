let element: HTMLElement | undefined
export function getPlainText(html: string) {
  element ??= document.createElement('div')
  element.innerHTML = html
  return element.textContent
}
