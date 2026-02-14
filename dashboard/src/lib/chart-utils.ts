const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value))

/**
 * Gera um path SVG de linha suave com interpolação cúbica monotônica (Fritsch-Carlson).
 * As curvas não ultrapassam os pontos (sem overshoot) e ficam dentro do eixo.
 */
export function linePathFromData(
  values: number[],
  width: number,
  height: number,
  padding: number = 20
): string {
  if (values.length < 2) return ''
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const innerHeight = height - padding * 2
  const step = width / (values.length - 1)
  const yMin = padding
  const yMax = height - padding

  const points = values.map((v, i) => {
    const x = i * step
    const y = padding + innerHeight - ((v - min) / range) * innerHeight
    return [x, clamp(y, yMin, yMax)] as const
  })

  const n = points.length
  const slopes: number[] = []
  for (let i = 0; i < n - 1; i++) {
    const dx = points[i + 1][0] - points[i][0] || 1
    slopes.push((points[i + 1][1] - points[i][1]) / dx)
  }
  const m: number[] = []
  for (let i = 0; i < n; i++) {
    if (i === 0) m.push(slopes[0])
    else if (i === n - 1) m.push(slopes[n - 2])
    else if (slopes[i - 1] * slopes[i] <= 0) m.push(0)
    else m.push((2 * slopes[i - 1] * slopes[i]) / (slopes[i - 1] + slopes[i]))
  }

  let path = `M ${points[0][0]} ${points[0][1]}`
  for (let i = 0; i < n - 1; i++) {
    const p0 = points[i]
    const p1 = points[i + 1]
    const dx = (p1[0] - p0[0]) / 3
    const cp1x = p0[0] + dx
    const cp1y = clamp(p0[1] + m[i] * dx, yMin, yMax)
    const cp2x = p1[0] - dx
    const cp2y = clamp(p1[1] - m[i + 1] * dx, yMin, yMax)
    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1[0]} ${p1[1]}`
  }
  return path
}

/**
 * Gera path para área (fill) abaixo da linha. Mesmo path da linha + L (bottom-right) L (bottom-left) Z.
 */
export function areaPathFromData(
  values: number[],
  width: number,
  height: number,
  padding: number = 20
): string {
  const linePath = linePathFromData(values, width, height, padding)
  if (!linePath) return ''
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const innerHeight = height - padding * 2
  const step = width / (values.length - 1)
  const lastX = (values.length - 1) * step
  const yBottom = padding + innerHeight
  return `${linePath} L ${lastX} ${yBottom} L 0 ${yBottom} Z`
}
