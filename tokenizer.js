/** A fixed teaching vocabulary. Its result is never presented as a commercial model's token count. */
const merges = [
  ['A', 'I'], [' ', 'l'], [' l', 'e'], [' le', 'a'], [' lea', 'r'],
  [' lear', 'n'], [' learn', 's'], ['H', 'e'], ['He', 'l'],
  ['Hel', 'l'], ['Hell', 'o'], [' ', 'A'], [' A', 'I'],
]
const encoder = new TextEncoder()
const decoder = new TextDecoder('utf-8', { fatal: true })
const key = (a, b) => `${a.join(',')}|${b.join(',')}`
const ranks = new Map(merges.map(([a, b], rank) => [key([...encoder.encode(a)], [...encoder.encode(b)]), rank]))

function node(bytes, id) {
  let label
  try { label = decoder.decode(Uint8Array.from(bytes)).replaceAll(' ', '␠') || '(空白)' }
  catch { label = bytes.map(x => x.toString(16).toUpperCase().padStart(2, '0')).join(' ') }
  return { bytes, id, label, hex: bytes.map(x => x.toString(16).toUpperCase().padStart(2, '0')).join(' ') }
}

export function tokenizeWithFrames(input) {
  let tokens = [...encoder.encode(input)].map(byte => node([byte], byte))
  const frames = [{ tokens, mergedIndex: -1, caption: '第 1 步：文字先编码为 UTF-8 字节。每个字节成为一个基础符号。' }]
  while (tokens.length > 1) {
    let bestIndex = -1
    let bestRank = Infinity
    for (let i = 0; i < tokens.length - 1; i++) {
      const rank = ranks.get(key(tokens[i].bytes, tokens[i + 1].bytes))
      if (rank !== undefined && rank < bestRank) { bestIndex = i; bestRank = rank }
    }
    if (bestIndex < 0) break
    const merged = node([...tokens[bestIndex].bytes, ...tokens[bestIndex + 1].bytes], 256 + bestRank)
    tokens = [...tokens.slice(0, bestIndex), merged, ...tokens.slice(bestIndex + 2)]
    frames.push({ tokens, mergedIndex: bestIndex, caption: `第 ${frames.length + 1} 步：按词表优先级合并相邻符号，得到「${merged.label}」。` })
  }
  frames.push({ tokens, mergedIndex: -1, caption: `完成：教学词表把输入分成 ${tokens.length} 个 Token。不同模型可能得到不同结果。` })
  return frames
}
