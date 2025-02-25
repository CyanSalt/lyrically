import { getSvgPath } from 'figma-squircle'

function toCSSURL(url: string) {
  return `url(${JSON.stringify(url)})`
}

function createDataURL(svg: string) {
  return `data:image/svg+xml,${encodeURIComponent(svg.trim())}`
}

export function getSVGShape(width: number, height: number, radius: number, spread: number) {
  const nsAttrs = ` xmlns="http://www.w3.org/2000/svg"`
  const sizeAttrs = ` width="${width + spread * 2}" height="${height}" viewBox="0 0 ${width + spread * 2} ${height}"`
  const fillAttrs = ` fill="#000"`
  const outerPath = [
    `M -${spread} 0`,
    `A ${spread} ${spread} 0 0 1 0 ${spread}`,
    `H ${width}`,
    `A ${spread} ${spread} 0 0 1 ${width + spread} 0`,
    'Z',
  ].join(' ')
  const innerPath = getSvgPath({
    width,
    height,
    bottomLeftCornerRadius: radius,
    bottomRightCornerRadius: radius,
    cornerSmoothing: 0.6,
  })
  const transformAttrs = ` transform="translate(${spread},0)"`
  const content = `<g${transformAttrs}><path d="${outerPath}"/><path d="${innerPath}"/></g>`
  return toCSSURL(createDataURL(`<svg${nsAttrs}${sizeAttrs}${fillAttrs}>${content}</svg>`))
}
