// 数值格式化：1.2K, 3.4M, 5.6B
export function fmt(n) {
  if (n === Infinity) return '∞'
  if (n < 1000) return Math.floor(n).toString()
  const units = ['', 'K', 'M', 'B', 'T', 'Q', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc']
  let i = 0
  while (n >= 1000 && i < units.length - 1) {
    n /= 1000
    i++
  }
  return n.toFixed(n < 10 ? 2 : n < 100 ? 1 : 0) + units[i]
}

// 数字漂浮动画生成key
let _k = 0
export function nextKey() {
  return ++_k
}
