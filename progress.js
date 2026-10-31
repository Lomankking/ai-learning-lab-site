const KEY = 'ai-learning-lab:progress:v2'
const OLD_KEY = 'ai-learning-lab:progress:v1'
const step = value => Number.isInteger(value) ? Math.max(0, Math.min(6, value)) : 0
const count = value => Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0
const text = (value, limit) => typeof value === 'string' ? value.slice(0, limit) : ''

export const initialProgress = {
  version: 2, lessons: {}, studySeconds: 0, activeLesson: 'token',
  // Kept for transparent migration of the first public release.
  lessonStep: 0, frameIndex: 0, completed: false, attempts: 0,
  lastAnswerCorrect: null, questionDraft: '', experimentInput: 'AI learns', updatedAt: '',
}

export function emptyLesson() {
  return { step: 0, frame: 0, tokenFrame: 0, completed: false, attempts: 0, mastery: 0, wrong: [],
    question: '', input: '', lastCorrect: null, completedAt: '', reviewAt: '', updatedAt: '' }
}

function cleanLesson(raw) {
  if (!raw || typeof raw !== 'object') return emptyLesson()
  return {
    step: step(raw.step), frame: count(raw.frame), tokenFrame: count(raw.tokenFrame), completed: raw.completed === true,
    attempts: count(raw.attempts), mastery: Math.min(100, count(raw.mastery)),
    wrong: Array.isArray(raw.wrong) ? raw.wrong.filter(x => typeof x === 'string').slice(0, 20) : [],
    question: text(raw.question, 500), input: text(raw.input, 100),
    lastCorrect: typeof raw.lastCorrect === 'boolean' ? raw.lastCorrect : null,
    completedAt: text(raw.completedAt, 50), reviewAt: text(raw.reviewAt, 50), updatedAt: text(raw.updatedAt, 50),
  }
}

export function normalizeProgress(raw) {
  if (!raw || typeof raw !== 'object') return structuredClone(initialProgress)
  const lessons = {}
  if (raw.lessons && typeof raw.lessons === 'object') {
    for (const [id, value] of Object.entries(raw.lessons).slice(0, 100)) lessons[id] = cleanLesson(value)
  }
  return { ...initialProgress, version: 2, lessons, studySeconds: count(raw.studySeconds),
    activeLesson: text(raw.activeLesson, 80) || 'token', updatedAt: text(raw.updatedAt, 50) }
}

export function loadProgress(storage = globalThis.localStorage) {
  try {
    const current = JSON.parse(storage.getItem(KEY))
    if (current?.version === 2) return normalizeProgress(current)
    const old = JSON.parse(storage.getItem(OLD_KEY))
    if (old?.version === 1) {
      const migrated = normalizeProgress(null)
      migrated.lessons.token = { ...emptyLesson(), step: step(old.lessonStep), frame: count(old.frameIndex),
        completed: old.completed === true, attempts: count(old.attempts), mastery: old.completed ? 100 : 0,
        question: text(old.questionDraft, 500), input: text(old.experimentInput, 100),
        lastCorrect: typeof old.lastAnswerCorrect === 'boolean' ? old.lastAnswerCorrect : null }
      return migrated
    }
  } catch {}
  return normalizeProgress(null)
}

export function saveProgress(progress, storage = globalThis.localStorage) {
  try {
    storage.setItem(KEY, JSON.stringify({ ...normalizeProgress(progress), updatedAt: new Date().toISOString() }))
    return true
  } catch { return false }
}

export function lessonProgress(progress, id) { return cleanLesson(progress.lessons?.[id]) }
export function updateLesson(progress, id, patch) {
  const old = lessonProgress(progress, id)
  return { ...progress, activeLesson: id, lessons: { ...progress.lessons, [id]: cleanLesson({ ...old, ...patch, updatedAt: new Date().toISOString() }) } }
}
export function markAnswer(progress, id, correct, answerText) {
  const old = lessonProgress(progress, id)
  const now = new Date()
  const reviewAt = new Date(now.getTime() + (correct ? 7 : 1) * 86400000).toISOString()
  return updateLesson(progress, id, {
    step: correct ? 6 : 5, completed: correct || old.completed,
    attempts: old.attempts + 1,
    mastery: correct ? Math.max(60, 100 - old.wrong.length * 15) : Math.max(0, old.mastery - 10),
    wrong: correct ? old.wrong : [...old.wrong, answerText].slice(-20),
    lastCorrect: correct, completedAt: correct ? now.toISOString() : old.completedAt, reviewAt,
  })
}
