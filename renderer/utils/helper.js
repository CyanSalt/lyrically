export function getHashCode(str) {
  let hash = 0
  for (let i = 0, len = str.length; i < len; i++) {
    let chr = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + chr
    hash |= 0
  }
  return hash
}

export function LCG(seed) {
  return () => {
    seed = Math.imul(48271, seed)
    return (2 ** 31 - 1 & seed) / 2 ** 31
  }
}
