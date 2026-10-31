const KEY = 'ai-learning-lab:progress:v1'
export const initialProgress = { version: 1, lessonStep: 0, frameIndex: 0, completed: false, attempts: 0, lastAnswerCorrect: null, questionDraft: '', experimentInput: 'AI learns', updatedAt: '' }

export function loadProgress(storage = globalThis.localStorage) {
  try {
    const data = JSON.parse(storage.getItem(KEY))
    if (!data || data.version !== 1) return { ...initialProgress }
    return {
      ...initialProgress,
      lessonStep: Number.isInteger(data.lessonStep) ? Math.max(0, Math.min(6, data.lessonStep)) : 0,
      frameIndex: Number.isInteger(data.frameIndex) ? Math.max(0, data.frameIndex) : 0,
      completed: data.completed === true,
      attempts: Number.isInteger(data.attempts) ? Math.max(0, data.attempts) : 0,
      lastAnswerCorrect: typeof data.lastAnswerCorrect === 'boolean' ? data.lastAnswerCorrect : null,
      questionDraft: typeof data.questionDraft === 'string' ? data.questionDraft.slice(0, 500) : '',
      experimentInput: typeof data.experimentInput === 'string' ? data.experimentInput.slice(0, 28) : 'AI learns',
      updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : '',
    }
  } catch { return { ...initialProgress } }
}

export function saveProgress(progress, storage = globalThis.localStorage) {
  try {
    storage.setItem(KEY, JSON.stringify({ ...progress, updatedAt: new Date().toISOString() }))
    return true
  } catch { return false }
}
