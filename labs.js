export const sigmoid = x => 1 / (1 + Math.exp(-x))
export function neuron(x1, x2, w1, w2, bias) {
  const sum = x1 * w1 + x2 * w2 + bias
  return { sum, output: sigmoid(sum) }
}
export function softmax(values) {
  const max = Math.max(...values)
  const powers = values.map(value => Math.exp(value - max))
  const total = powers.reduce((a, b) => a + b, 0)
  return powers.map(value => value / total)
}
export function cosine(a, b) {
  const dot = a.reduce((total, value, index) => total + value * b[index], 0)
  const normA = Math.hypot(...a)
  const normB = Math.hypot(...b)
  return normA && normB ? dot / (normA * normB) : 0
}
