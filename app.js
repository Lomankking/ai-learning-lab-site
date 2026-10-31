import { tracks, titles, video } from './curriculum.js'
import { loadProgress, saveProgress } from './progress.js'
import { tokenizeWithFrames } from './tokenizer.js'

const root = document.getElementById('root')
const steps = ['学习目标', '基础概念', '分步图解', '动手实验', '提问时间', '一道练习', '课程完成']
let progress = loadProgress()
let inputText = progress.experimentInput
let selectedAnswer = null
let selectedNode = null
let playing = false
let playTimer = null
let storageError = false

const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char])
const routeIsLesson = () => location.hash === '#/lesson/token'
const percent = () => progress.completed ? 100 : Math.round(progress.lessonStep / 6 * 100)
function persist() { storageError = !saveProgress(progress) }
function update(patch, scroll = false) {
  progress = { ...progress, ...patch }
  persist()
  render()
  if (scroll) window.scrollTo({ top: 0, behavior: 'smooth' })
}
function stopPlayback() { playing = false; if (playTimer) clearTimeout(playTimer); playTimer = null }
function currentFrames() { return tokenizeWithFrames(progress.lessonStep === 3 ? inputText : 'AI learns') }

function layout(content) {
  const onLesson = routeIsLesson()
  return `<div class="app-shell">
    <aside class="sidebar">
      <button class="brand" data-action="home" aria-label="返回 AI Learning Lab 首页"><span class="brand-mark">✦</span><span><strong>AI Learning Lab</strong><small>探索 · 理解 · 创造</small></span></button>
      <div class="sidebar-section-label">学习空间</div>
      <nav class="main-nav" aria-label="主导航"><a href="#/" class="${onLesson ? '' : 'active'}">◫ <span>学习首页</span></a><a href="#/lesson/token" class="${onLesson ? 'active' : ''}">▣ <span>Token 课程</span></a></nav>
      <div class="sidebar-note"><span class="note-icon">✦</span><strong>从一个概念开始</strong><p>先弄清 Token，再逐步走向 AI Agent 开发。</p><button data-action="lesson">继续学习 →</button></div>
      <div class="sidebar-bottom">第一阶段 · 可用版本</div>
    </aside>
    <main class="main-content"><header class="topbar"><span class="breadcrumb">AI Learning Lab <span>/</span> ${onLesson ? 'Token 教学课程' : '学习首页'}</span><span class="topbar-status"><span class="status-dot"></span> 本地进度已启用</span></header>
      ${storageError ? '<div class="storage-warning" role="alert">浏览器当前无法保存学习进度。请检查存储权限。</div>' : ''}
      ${content}
      <footer class="footer"><span>© AI Learning Lab · 用理解构建未来</span><span>第一阶段：Token 可视化课程</span></footer>
    </main></div>`
}

function catalog() {
  return `<section class="hero"><div class="hero-copy"><span class="hero-kicker">✦ 你的 AI 学习旅程，从这里开始</span><h1>把复杂的 AI，<br><span>一步步看懂。</span></h1><p>不只是阅读概念。通过逐步讲解、可视化实验与即时练习，真正理解人工智能如何运作。</p><button class="hero-button" data-action="lesson">${progress.lessonStep > 0 ? '继续 Token 课程' : '开始第一课'} →</button></div><div class="hero-visual" aria-hidden="true"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><div class="hero-center">AI<span>LAB</span></div><span class="float-card float-one">Token</span><span class="float-card float-two">Agent</span><span class="float-card float-three">Code</span><span class="hero-spark spark-one">✦</span></div></section>
    <section class="overview-grid"><div class="overview-card progress-card"><div class="overview-icon lavender">◫</div><div><span>当前学习进度</span><strong>${percent()}%</strong><small>Token：模型如何看文字</small></div><div class="mini-progress"><i style="width:${percent()}%"></i></div></div><div class="overview-card"><div class="overview-icon mint">▣</div><div><span>可学课程</span><strong>01 <em>/ 12</em></strong><small>从 Token 教学开始</small></div></div><div class="overview-card"><div class="overview-icon peach">✓</div><div><span>已完成课程</span><strong>${progress.completed ? '01' : '00'} <em>/ 12</em></strong><small>${progress.completed ? '继续探索后续知识' : '完成第一课，点亮进度'}</small></div></div></section>
    <section class="section-heading"><div><span class="eyebrow">LEARNING PATH</span><h2>系统课程目录</h2><p>按知识依赖循序渐进。首节 Token 课程现已开放。</p></div><span class="path-count">3 个阶段 · 12 个知识点</span></section>
    <div class="tracks">${tracks.map(track => `<section class="track"><div class="track-header"><div class="track-number">${track.number}</div><div><h3>${track.title}</h3><p>${track.description}</p></div><span class="track-count">${track.lessons.length} 节课</span></div><div class="lesson-grid">${track.lessons.map(([id, title, description, prerequisites, available]) => `<article class="lesson-card ${available ? 'available' : 'planned'}"><div class="lesson-card-top"><span class="lesson-icon ${available ? 'active-icon' : ''}">${available ? '▶' : '▣'}</span><span class="lesson-badge ${available ? 'open-badge' : ''}">${available ? progress.completed ? '已完成' : '开放学习' : '规划中'}</span></div><h4>${title}</h4><p>${description}</p><div class="prerequisites">${prerequisites.length ? `先学：${prerequisites.map(item => titles[item]).join('、')}` : '无需前置知识'}</div><div class="lesson-card-bottom"><span>${id === 'token' ? '约 12 分钟' : '规划中'}</span>${available ? '<button data-action="lesson">进入课程 →</button>' : ''}</div></article>`).join('')}</div></section>`).join('')}</div>`
}

function diagram() {
  const frames = currentFrames()
  const index = Math.min(progress.frameIndex, frames.length - 1)
  const frame = frames[index]
  const width = Math.max(650, frame.tokens.length * 112 + 54)
  const selected = selectedNode === null ? null : frame.tokens[selectedNode]
  const input = progress.lessonStep === 3 ? inputText : 'AI learns'
  return `<div class="diagram-panel"><div class="diagram-head"><div><span class="eyebrow">LIVE VISUALIZATION</span><h3>${progress.lessonStep === 3 ? '试试改变输入文字' : '观察符号如何合并'}</h3></div><span class="demo-badge"><span class="live-dot"></span> 实时计算</span></div>
    <div class="input-flow"><span>输入文本</span><strong>${escapeHtml(input || '（空输入）')}</strong><span class="flow-arrow">↓</span><span>UTF-8 字节 → 按优先级合并</span></div>
    <div class="diagram-scroll" aria-label="Token 分步图，横向滚动可查看全部节点"><svg width="${width}" height="142" viewBox="0 0 ${width} 142" role="group" aria-label="当前分成 ${frame.tokens.length} 个符号"><path d="M24 25 H${width - 24}" stroke="#d9deeb" stroke-width="2" />
    ${frame.tokens.map((token, tokenIndex) => { const x = 28 + tokenIndex * 112; const highlight = frame.mergedIndex === tokenIndex; return `<g class="svg-node" role="button" tabindex="0" data-node="${tokenIndex}" aria-label="查看符号 ${escapeHtml(token.label)} 的说明"><path d="M${x + 48} 25 V45" stroke="${highlight ? '#7659e8' : '#c6ccdd'}" stroke-width="2"/><rect x="${x}" y="51" width="96" height="65" rx="13" fill="${highlight ? '#eee9ff' : selectedNode === tokenIndex ? '#e5f4ef' : '#fff'}" stroke="${highlight ? '#8062e8' : selectedNode === tokenIndex ? '#4dbf9e' : '#dce1ed'}" stroke-width="1.5"/><text x="${x + 48}" y="79" text-anchor="middle" fill="#202441" font-size="16" font-weight="700">${escapeHtml(token.label.length > 8 ? `${token.label.slice(0, 7)}…` : token.label)}</text><text x="${x + 48}" y="100" text-anchor="middle" fill="#818aa3" font-size="11">ID ${token.id}</text></g>` }).join('')}</svg></div>
    <div class="diagram-caption"><span class="step-counter">${String(index + 1).padStart(2, '0')} / ${String(frames.length).padStart(2, '0')}</span><p>${escapeHtml(frame.caption)}</p></div>
    ${selected ? `<div class="node-detail" role="status"><strong>符号「${escapeHtml(selected.label)}」</strong><span>字节：${selected.hex} · 教学词表 ID：${selected.id}</span><p>${selected.id < 256 ? '这是原始 UTF-8 字节；还没有与相邻符号合并。' : '这是根据词表规则计算出的新符号。'}不同模型可能使用不同词表。</p></div>` : ''}
    <div class="playback-controls"><button class="control-button" data-action="prev-frame" ${index === 0 ? 'disabled' : ''}>← 上一帧</button><button class="control-button primary-control" data-action="next-frame" ${index === frames.length - 1 ? 'disabled' : ''}>下一帧 →</button><button class="control-button" data-action="replay">▶ 重播</button></div></div>`
}

function lessonBody() {
  switch (progress.lessonStep) {
    case 0: return `<div class="lesson-illustration">✦ <span>文字 → Token → 模型理解</span></div><h2>今天，我们先弄懂 Token</h2><p class="lead">你向 AI 输入一段话时，模型并不会直接“看见”整句话。它先把文字变成一串 Token，再开始处理。</p><div class="goal-box"><strong>学完这一课，你将能够：</strong><ul><li>说清 Token 与单词、字符的区别</li><li>观察一个简化词表如何合并文字片段</li><li>理解为什么不同模型的 Token 数量可能不同</li></ul></div>`
    case 1: return `<span class="content-tag">从最基础的概念开始</span><h2>Token 是文字的“小片段”</h2><p class="lead">模型把输入切成可编号的片段，片段可以是一个字、半个词、一个标点，甚至是一段字节。每个片段对应词表中的一个 ID。</p><div class="concept-row"><div><span>输入文字</span><strong>AI learns</strong></div><b>→</b><div><span>示意切分</span><strong>[AI] [ learns]</strong></div><b>→</b><div><span>模型接收</span><strong>Token ID 序列</strong></div></div><div class="info-box"><strong>记住这一点</strong><p>Token 不等于“一个完整单词”。切分方式取决于模型使用的词表和分词规则。</p></div>`
    case 2: return `<span class="content-tag">跟着动画观察</span><h2>看一看，符号怎样一步步合并</h2><p class="lead">点击“下一帧”观察每次合并，也可以点图中的节点查看它的字节与 ID。</p><div id="diagram-target">${diagram()}</div><p class="footnote">这里使用固定的教学词表演示真实合并计算。结果只适用于这个教学示例。</p>`
    case 3: return `<span class="content-tag">换你动手</span><h2>改变文字，观察结果</h2><p class="lead">输入短文字。图形会根据同一套合并规则重新计算，而不是播放固定画面。</p><label class="experiment-label" for="token-input">输入文字 <span>最多 28 个字符</span></label><input id="token-input" class="experiment-input" maxlength="28" value="${escapeHtml(inputText)}" placeholder="例如：Hello AI"><div id="diagram-target">${diagram()}</div><p class="footnote">这个小词表只定义了少量英文合并规则。中文会按真实 UTF-8 字节计算，但不会冒充某个实际模型的分词结果。</p>`
    case 4: return `<span class="content-tag">停下来想一想</span><h2>有疑问吗？我们先不急着做题。</h2><p class="lead">你可以回看图解，或者把疑问留在这里。第一阶段尚未接入 AI 导师，记录会保存在这台设备上。</p><label class="experiment-label" for="question">我的疑问（可选）</label><textarea id="question" class="question-input" maxlength="500" placeholder="例如：为什么空格也可能成为 Token 的一部分？">${escapeHtml(progress.questionDraft)}</textarea><details class="faq"><summary>常见疑问：为什么空格会和词合并？</summary><p>词表从文本中学习常见片段。带前导空格的词片段可能经常出现，因此某些词表会把空格和后面的文字合并。不同模型的规则并不相同。</p></details><p class="small-note">准备好后再进入练习。本课一次只出一道题。</p>`
    case 5: return `<span class="content-tag">只做这一题</span><h2>检查一下你的理解</h2><p class="lead">关于 Token，下面哪句话是正确的？</p><div class="answer-options" role="radiogroup" aria-label="Token 练习题">${['一个 Token 总是一个完整单词。', '同一段文字在不同模型中，可能被切分成不同数量的 Token。', 'Token 数量只由文字长度决定，与词表无关。'].map((option, index) => `<button role="radio" aria-checked="${selectedAnswer === index}" class="${selectedAnswer === index ? 'chosen' : ''}" data-answer="${index}"><span>${String.fromCharCode(65 + index)}</span>${option}</button>`).join('')}</div>${progress.lastAnswerCorrect === false ? '<div class="feedback incorrect" role="alert"><strong>再想一想</strong><p>Token 的划分依赖模型词表。一个词可能被分成多个片段，空格也可能与文字合并。回看“基础概念”，再试同一道题。</p><button data-action="review">回看基础概念 →</button></div>' : ''}<button class="submit-button" data-action="submit" ${selectedAnswer === null ? 'disabled' : ''}>提交答案 →</button>`
    default: return `<div class="completion-icon">✓</div><span class="content-tag">你完成了第一课</span><h2>做得好，Token 已经不神秘了。</h2><p class="lead">正确！同一段文字在不同模型中，确实可能被切分成不同数量的 Token。你已经理解了继续学习 Embedding 和上下文管理的关键前提。</p><div class="goal-box"><strong>本课回顾</strong><ul><li>Token 是模型词表中的文字片段，而非固定长度的词</li><li>教学图中的结果由真实合并步骤计算得出</li><li>实际模型的 Token 数量需要使用对应模型的分词器</li></ul></div><button class="submit-button" data-action="home">返回课程目录 →</button>`
  }
}

function lesson() {
  return `<div class="lesson-header"><button class="back-link" data-action="home">← 返回课程目录</button><span class="lesson-category">01 / 建立 AI 直觉</span><h1>Token：模型如何看文字</h1><p>从你熟悉的一句话开始，亲眼看见文字如何变成模型处理的符号。</p><div class="lesson-meta"><span>◷ 约 12 分钟</span><span>◈ 零基础</span><span>✦ 交互式图解</span></div></div>
    <div class="lesson-layout"><div class="lesson-primary"><div class="lesson-progress"><div class="progress-top"><span>课程进度</span><strong>${percent()}%</strong></div><div class="progress-bar"><span style="width:${percent()}%"></span></div><div class="step-dots">${steps.map((step, index) => `<button data-step="${index}" ${index > progress.lessonStep && !progress.completed ? 'disabled' : ''} class="${index === progress.lessonStep ? 'current' : index < progress.lessonStep || progress.completed ? 'done' : ''}" aria-label="${step}${index === progress.lessonStep ? '，当前步骤' : ''}" title="${step}"><span>${index < progress.lessonStep || progress.completed ? '✓' : index + 1}</span></button>`).join('')}</div></div>
    <article class="teaching-card"><div class="card-step"><span>STEP ${String(progress.lessonStep + 1).padStart(2, '0')}</span><span>${steps[progress.lessonStep]}</span></div>${lessonBody()}<div class="lesson-actions">${progress.lessonStep > 0 && progress.lessonStep < 6 ? '<button class="text-button" data-action="previous">← 上一步</button>' : ''}${progress.lessonStep < 5 ? `<button class="next-button" data-action="continue">${progress.lessonStep === 4 ? '我准备好做题了' : '继续学习'} →</button>` : ''}</div></article></div>
    <aside class="lesson-aside"><div class="aside-card"><span class="eyebrow">YOUR PATH</span><h3>本课路线</h3><ol>${steps.map((step, index) => `<li class="${index === progress.lessonStep ? 'active' : index < progress.lessonStep || progress.completed ? 'done' : ''}"><span>${index < progress.lessonStep || progress.completed ? '✓' : index + 1}</span>${step}</li>`).join('')}</ol></div><div class="aside-card video-card"><div class="video-thumb">▶</div><span class="eyebrow">延伸观看 · ${video.level}</span><h3>${video.title}</h3><p>${video.author} · ${video.source}</p><small>对应知识点：${video.concept}</small><a href="${video.url}" target="_blank" rel="noopener noreferrer">在新标签页观看 ↗</a></div><div class="aside-hint">✦<p>每一步只讲一个重点。你可以随时回看，进度会自动保存在本机。</p></div></aside></div>`
}

function render() {
  root.innerHTML = layout(routeIsLesson() ? lesson() : catalog())
  schedulePlayback()
}
function redrawDiagram() { const target = document.getElementById('diagram-target'); if (target) target.innerHTML = diagram() }
function schedulePlayback() {
  if (!playing) return
  if (playTimer) clearTimeout(playTimer)
  const last = currentFrames().length - 1
  if (progress.frameIndex >= last) { stopPlayback(); return }
  playTimer = setTimeout(() => update({ frameIndex: progress.frameIndex + 1 }), 850)
}

document.addEventListener('click', event => {
  const answerButton = event.target.closest('[data-answer]')
  if (answerButton) { selectedAnswer = Number(answerButton.dataset.answer); render(); return }
  const nodeButton = event.target.closest('[data-node]')
  if (nodeButton) { selectedNode = Number(nodeButton.dataset.node); redrawDiagram(); return }
  const stepButton = event.target.closest('[data-step]')
  if (stepButton && !stepButton.disabled) { stopPlayback(); selectedNode = null; update({ lessonStep: Number(stepButton.dataset.step), frameIndex: 0 }, true); return }
  const action = event.target.closest('[data-action]')?.dataset.action
  if (!action) return
  if (action === 'home') location.hash = '#/'
  if (action === 'lesson') location.hash = '#/lesson/token'
  if (action === 'continue') { stopPlayback(); selectedNode = null; update({ lessonStep: progress.lessonStep + 1, frameIndex: 0 }, true) }
  if (action === 'previous') { stopPlayback(); selectedNode = null; update({ lessonStep: progress.lessonStep - 1, frameIndex: 0 }, true) }
  if (action === 'review') update({ lessonStep: 1, frameIndex: 0 }, true)
  if (action === 'prev-frame' || action === 'next-frame') { stopPlayback(); selectedNode = null; update({ frameIndex: Math.max(0, Math.min(currentFrames().length - 1, progress.frameIndex + (action === 'next-frame' ? 1 : -1))) }) }
  if (action === 'replay') { stopPlayback(); selectedNode = null; playing = true; update({ frameIndex: 0 }) }
  if (action === 'submit' && selectedAnswer !== null) {
    const correct = selectedAnswer === 1
    if (!correct) selectedAnswer = null
    update({ attempts: progress.attempts + 1, lastAnswerCorrect: correct, completed: correct, lessonStep: correct ? 6 : 5 }, correct)
  }
})

document.addEventListener('input', event => {
  if (event.target.id === 'token-input') { stopPlayback(); inputText = event.target.value; selectedNode = null; progress.frameIndex = 0; progress.experimentInput = inputText; persist(); redrawDiagram() }
  if (event.target.id === 'question') { progress.questionDraft = event.target.value.slice(0, 500); persist() }
})
document.addEventListener('keydown', event => {
  const node = event.target.closest?.('[data-node]')
  if (node && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); selectedNode = Number(node.dataset.node); redrawDiagram() }
})
window.addEventListener('hashchange', () => { stopPlayback(); render(); window.scrollTo(0, 0) })
persist()
render()
