import { tracks, lessons, lessonById, titles } from './curriculum.js'
import { loadProgress, saveProgress, lessonProgress, updateLesson, markAnswer, normalizeProgress } from './progress.js'
import { tokenizeWithFrames } from './tokenizer.js'
import { neuron, softmax, cosine } from './labs.js'

const root = document.getElementById('root')
const steps = ['目标','基础概念','分步图解','实际案例','提问时间','一道练习','课程完成']
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
let progress = loadProgress()
let answer = null
let selectedNode = null
let playing = false
let playTimer
let storageError = false
let labMode = 'token'
let labText = 'AI learns'
let labNumbers = [1, 0.5, 0.7, -0.2, 0.1]
let chat = []
let controller = null
let tutorError = ''
let importError = ''
let lastTick = Date.now()

function persist() { storageError = !saveProgress(progress) }
function setProgress(next, redraw = true) { progress = next; persist(); if (redraw) render() }
function patchLesson(id, patch) { setProgress(updateLesson(progress, id, patch)) }
function route() {
  const path = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean)
  return { page: path[0] || 'home', id: path[1] || 'token' }
}
function go(path) { location.hash = '#/' + path; window.scrollTo({ top: 0, behavior: 'smooth' }) }
function stopPlay() { playing = false; clearTimeout(playTimer) }
function countDone() { return lessons.filter(item => lessonProgress(progress, item.id).completed).length }
function percent(item) { return item.completed ? 100 : Math.round(item.step / 6 * 100) }
function currentLesson() { return lessonById[route().id] }

function layout(body) {
  const r = route()
  const links = [['home','⌂','学习首页'],['courses','▦','系统课程'],['tutor','✧','AI 导师'],['lab','◇','可视化实验室'],['videos','▶','视频资源'],['data','◫','学习数据']]
  return `<div class="app-shell"><aside class="sidebar">
    <button class="brand" data-go="home"><span class="brand-mark">✦</span><span><strong>AI Learning Lab</strong><small>探索 · 理解 · 创造</small></span></button>
    <div class="sidebar-section-label">学习空间</div>
    <nav class="main-nav" aria-label="主导航">${links.map(([id,icon,label]) => `<a href="#/${id}" class="${r.page === id || r.page === 'lesson' && id === 'courses' ? 'active' : ''}"><b aria-hidden="true">${icon}</b><span>${label}</span></a>`).join('')}</nav>
    <div class="sidebar-note"><span class="note-icon">✦</span><strong>循序渐进</strong><p>12 节课程、交互图解和学习记录，陪你从零基础走到 Agent 开发。</p><button data-go="courses">查看课程 →</button></div>
    <div class="sidebar-bottom">课程内容可离线学习 · 学习记录保存在本机</div>
  </aside><main class="main-content"><header class="topbar"><span class="breadcrumb">AI Learning Lab <span>/</span> ${r.page === 'lesson' ? esc(titles[r.id] || '课程') : esc(links.find(x => x[0] === r.page)?.[2] || '学习首页')}</span><span class="topbar-status"><span class="status-dot"></span> ${countDone()} / 12 已完成</span></header>
  ${storageError ? '<div class="storage-warning" role="alert">浏览器无法保存进度，请检查存储权限并导出备份。</div>' : ''}
  ${body}<footer class="footer"><span>© AI Learning Lab · 用理解构建未来</span><span>课程、实验、进度和 PWA</span></footer></main></div>`
}

function home() {
  const current = lessonById[progress.activeLesson] || lessonById.token
  return `<section class="hero"><div class="hero-copy"><span class="hero-kicker">✦ 你的 AI 学习旅程</span><h1>把复杂的 AI，<br><span>一步步看懂。</span></h1><p>通过逐步讲解、可视化计算、互动练习与延伸视频，从基础走向真实 AI 开发。</p><div class="hero-actions"><button class="hero-button" data-go="lesson/${current.id}">继续学习 →</button><button class="hero-install" data-action="install">↓ 安装到手机</button></div><p class="install-hint" id="install-hint" hidden>请在浏览器菜单选择“安装应用”或“添加到主屏幕”。</p></div><div class="hero-visual" aria-hidden="true"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><div class="hero-center">AI<span>LAB</span></div><span class="float-card float-one">Token</span><span class="float-card float-two">Agent</span><span class="float-card float-three">Code</span></div></section>
  <section class="overview-grid"><div class="overview-card"><div class="overview-icon lavender">◫</div><div><span>当前课程</span><strong>${percent(lessonProgress(progress,current.id))}%</strong><small>${esc(current.title)}</small></div></div><div class="overview-card"><div class="overview-icon mint">▣</div><div><span>可学课程</span><strong>12 <em>/ 12</em></strong><small>按前置知识顺序学习</small></div></div><div class="overview-card"><div class="overview-icon peach">✓</div><div><span>已完成</span><strong>${countDone()} <em>/ 12</em></strong><small>进度在本机保存</small></div></div></section>
  <section class="section-heading"><div><span class="eyebrow">LEARNING PATH</span><h2>从这里继续</h2><p>每节课只展示当前步骤，完成一道题后记录掌握度。</p></div><button class="plain-link" data-go="courses">查看全部课程 →</button></section>${catalog(true)}`
}

function catalog(compact = false) {
  return `${compact ? '' : '<section class="page-heading"><span class="eyebrow">SYSTEM CURRICULUM</span><h1>系统课程目录</h1><p>从概念、编程到 Agent 开发。前置关系清楚标注，所有课程都可进入学习。</p></section>'}
  <div class="tracks">${tracks.map(track => `<section class="track"><div class="track-header"><div class="track-number">${track.number}</div><div><h3>${track.title}</h3><p>${track.description}</p></div><span class="track-count">${track.lessons.length} 节课</span></div><div class="lesson-grid">${track.lessons.map(id => {
    const item = lessonById[id], state = lessonProgress(progress,id)
    return `<article class="lesson-card available"><div class="lesson-card-top"><span class="lesson-icon active-icon">▶</span><span class="lesson-badge open-badge">${state.completed ? '已完成' : state.step ? '学习中' : '开放学习'}</span></div><h4>${esc(item.title)}</h4><p>${esc(item.description)}</p><div class="prerequisites">${item.prerequisites.length ? '建议先学：' + item.prerequisites.map(key => esc(titles[key])).join('、') : '无需前置知识'}</div><div class="lesson-card-bottom"><span>约 ${item.minutes} 分钟</span><button data-go="lesson/${id}">进入课程 →</button></div></article>`
  }).join('')}</div></section>`).join('')}</div>`
}

function graph(item, frame, node) {
  const nodes = item.nodes
  const width = Math.max(600, nodes.length * 155)
  return `<div class="diagram-panel"><div class="diagram-head"><div><span class="eyebrow">STEP VISUALIZATION</span><h3>跟随信息流</h3></div><span class="demo-badge">${frame + 1} / ${item.frames.length}</span></div>
  <div class="diagram-scroll"><svg width="${width}" height="175" viewBox="0 0 ${width} 175" role="img" aria-label="${esc(item.title)}流程图">
  <defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 Z" fill="#a99add"/></marker></defs>
  ${item.edges.map(([from,to]) => {
    const x1=from*155+146, x2=to*155+20
    const path=to===from+1 ? `M${x1} 86 H${x2}` : to>from ? `M${x1} 76 Q${(x1+x2)/2} 2 ${x2} 76` : `M${from*155+83} 122 Q${(from+to)*77.5} 172 ${to*155+83} 122`
    return `<path d="${path}" fill="none" stroke="${from<=frame ? '#7659e8' : '#c5c9d7'}" stroke-width="3" marker-end="url(#arrow)"/>`
  }).join('')}
  ${nodes.map((entry,i) => `<g class="svg-node" role="button" tabindex="0" data-node="${i}" aria-label="查看${esc(entry.label)}"><rect x="${i*155+20}" y="47" width="126" height="75" rx="15" fill="${i === frame ? '#eee9ff' : node === i ? '#e4f7ee' : '#fff'}" stroke="${i === frame ? '#7659e8' : '#dce1ed'}" stroke-width="2"/><text x="${i*155+83}" y="90" text-anchor="middle" fill="#252542" font-size="14" font-weight="700">${esc(entry.label)}</text><circle cx="${i*155+83}" cy="135" r="10" fill="${i <= frame ? '#7659e8' : '#e4e5ed'}"/><text x="${i*155+83}" y="139" text-anchor="middle" fill="white" font-size="10">${i+1}</text></g>`).join('')}</svg></div>
  <div class="diagram-caption"><span class="step-counter">${String(frame+1).padStart(2,'0')} / ${String(item.frames.length).padStart(2,'0')}</span><p>${esc(item.frames[frame])}</p></div>
  ${node !== null ? `<div class="node-detail" role="status"><strong>${esc(nodes[node].label)}</strong><p>${esc(item.frames[node])}</p></div>` : ''}
  <div class="playback-controls"><button class="control-button" data-action="prev-frame" ${frame === 0 ? 'disabled' : ''}>← 上一帧</button><button class="control-button primary-control" data-action="next-frame" ${frame === item.frames.length-1 ? 'disabled' : ''}>下一帧 →</button><button class="control-button" data-action="replay">▶ 重播</button></div></div>`
}

function tokenLab(input, frame) {
  const frames = tokenizeWithFrames(input)
  const current = frames[Math.min(frame,frames.length-1)]
  const width = Math.max(500,current.tokens.length*110+30)
  return `<div class="diagram-panel"><div class="diagram-head"><div><span class="eyebrow">LIVE CALCULATION</span><h3>教学词表分词计算</h3></div><span class="demo-badge">真实计算</span></div><div class="diagram-scroll"><svg width="${width}" height="104" role="img" aria-label="分成 ${current.tokens.length} 个符号">${current.tokens.map((token,i) => `<g class="svg-node" role="button" tabindex="0" data-token="${i}"><rect x="${i*110+12}" y="13" width="96" height="70" rx="11" fill="${i === current.mergedIndex ? '#eee9ff' : '#fff'}" stroke="#bcb0e8"/><text x="${i*110+60}" y="43" text-anchor="middle" font-size="14" fill="#252542">${esc(token.label.slice(0,8))}</text><text x="${i*110+60}" y="66" text-anchor="middle" font-size="10" fill="#8089a0">ID ${token.id}</text></g>`).join('')}</svg></div><div class="diagram-caption"><span class="step-counter">${Math.min(frame+1,frames.length)} / ${frames.length}</span><p>${esc(current.caption)}</p></div><div class="playback-controls"><button class="control-button" data-action="token-prev" ${frame===0?'disabled':''}>← 上一帧</button><button class="control-button" data-action="token-next" ${frame>=frames.length-1?'disabled':''}>下一帧 →</button><button class="control-button" data-action="token-replay">▶ 重播</button></div></div>`
}

function lessonBody(item,state) {
  switch(state.step) {
    case 0: return `<div class="lesson-illustration">✦ <span>${esc(item.description)}</span></div><h2>本节课的目标</h2><p class="lead">${esc(item.goal)}</p><div class="goal-box"><strong>学习路线</strong><p>基础概念 → 分步图解 → 实际案例 → 提问 → 一道练习</p></div>`
    case 1: return `<span class="content-tag">从基础概念开始</span><h2>${esc(item.title)}</h2><p class="lead">${esc(item.basics)}</p><div class="goal-box"><strong>理解这三个关键点</strong><ul>${item.concepts.map(point=>`<li>${esc(point)}</li>`).join('')}</ul></div><div class="info-box"><strong>接下来</strong><p>下一步会用图形展示这段流程。每次只突出一个环节。</p></div>`
    case 2: return `<span class="content-tag">跟随图形观察</span><h2>一步步看清工作原理</h2><p class="lead">点击节点查看解释，也可以用上一帧、下一帧和重播控制信息流。</p>${graph(item,Math.min(state.frame,item.frames.length-1),selectedNode)}${item.id==='token'?tokenLab(state.input||'AI learns',state.tokenFrame||0):''}`
    case 3: return `<span class="content-tag">实际案例</span><h2>放进真实情境</h2><p class="lead">${esc(item.example)}</p>${item.codeExample?`<pre class="example-code"><code>${esc(item.codeExample)}</code></pre>`:''}${['ml-dl','embedding-transformer','rag','token'].includes(item.id) ? '<button class="next-button" data-go="lab">打开对应的可视化实验室 →</button>' : ''}<div class="info-box"><strong>思考一下</strong><p>哪些输入是已知的？哪一步由程序计算？哪一步需要人核对？</p></div>`
    case 4: return `<span class="content-tag">提问时间</span><h2>先停下来整理疑问</h2><p class="lead">可把疑问写在这里，进度会保存在本机。若已配置导师服务，也可进入 AI 导师继续追问。</p><label for="question" class="experiment-label">我的疑问（可选）</label><textarea id="question" class="question-input" maxlength="500" placeholder="这一环节哪里还不清楚？">${esc(state.question)}</textarea><button class="plain-link" data-go="tutor">打开 AI 导师 →</button><p class="small-note">准备好后进入本课唯一的一道练习题。</p>`
    case 5: return `<span class="content-tag">每次只做一题</span><h2>检查一下理解</h2><p class="lead">${esc(item.quiz.question)}</p><div class="answer-options" role="radiogroup" aria-label="本课练习题">${item.quiz.options.map((option,i) => `<button role="radio" aria-checked="${answer===i}" class="${answer===i?'chosen':''}" data-answer="${i}"><span>${String.fromCharCode(65+i)}</span>${esc(option)}</button>`).join('')}</div>${state.lastCorrect===false ? `<div class="feedback incorrect" role="alert"><strong>再试一次</strong><p>${esc(item.quiz.explanation)} 你可以回看基础概念，再回答同一道题。</p><button data-action="review">回看基础概念 →</button></div>` : ''}<button class="submit-button" data-action="submit" ${answer===null?'disabled':''}>提交答案 →</button>`
    default: return `<div class="completion-icon">✓</div><span class="content-tag">本课完成</span><h2>你掌握了${esc(item.title)}</h2><p class="lead">${esc(item.quiz.explanation)}</p><div class="goal-box"><strong>你已经能够</strong><p>${esc(item.goal)}</p><p>下次复习：${state.reviewAt ? esc(new Date(state.reviewAt).toLocaleDateString('zh-CN')) : '一周后'}</p></div><button class="submit-button" data-go="courses">返回课程目录 →</button>`
  }
}

function lessonPage(item) {
  const state=lessonProgress(progress,item.id)
  return `<div class="lesson-header"><button class="back-link" data-go="courses">← 返回课程目录</button><span class="lesson-category">系统课程 · ${item.prerequisites.length ? '建议先学 ' + item.prerequisites.map(id=>esc(titles[id])).join('、') : '零基础可开始'}</span><h1>${esc(item.title)}</h1><p>${esc(item.description)}</p><div class="lesson-meta"><span>◷ 约 ${item.minutes} 分钟</span><span>✦ 交互式图解</span></div></div>
  <div class="lesson-layout"><div class="lesson-primary"><div class="lesson-progress"><div class="progress-top"><span>课程进度</span><strong>${percent(state)}%</strong></div><div class="progress-bar"><span style="width:${percent(state)}%"></span></div><div class="step-dots">${steps.map((step,i)=>`<button data-step="${i}" ${i>state.step&&!state.completed?'disabled':''} class="${i===state.step?'current':i<state.step||state.completed?'done':''}" aria-label="${step}"><span>${i<state.step||state.completed?'✓':i+1}</span></button>`).join('')}</div></div><article class="teaching-card"><div class="card-step"><span>STEP ${String(state.step+1).padStart(2,'0')}</span><span>${steps[state.step]}</span></div>${lessonBody(item,state)}<div class="lesson-actions">${state.step>0&&state.step<6?'<button class="text-button" data-action="previous">← 上一步</button>':''}${state.step<5?`<button class="next-button" data-action="continue">${state.step===4?'我准备好做题了':'继续学习'} →</button>`:''}</div></article></div>
  <aside class="lesson-aside"><div class="aside-card"><span class="eyebrow">YOUR PATH</span><h3>本课路线</h3><ol>${steps.map((step,i)=>`<li class="${i===state.step?'active':i<state.step||state.completed?'done':''}"><span>${i<state.step||state.completed?'✓':i+1}</span>${step}</li>`).join('')}</ol></div>${videoCard(item)}<div class="aside-hint">✦<p>课程进度自动保存在本机。你可以从学习数据页导出备份。</p></div></aside></div>`
}

function videoCard(item) {
  const v=item.video
  return `<div class="aside-card video-card"><div class="video-thumb">▶</div><span class="eyebrow">延伸观看 · ${esc(v.level)}</span><h3>${esc(v.title)}</h3><p>${esc(v.author)} · ${esc(v.source)}</p><small>对应知识点：${esc(v.concept)}${v.segment?' · 推荐片段 '+esc(v.segment):''}</small><a href="${esc(v.url)}" target="_blank" rel="noopener noreferrer">在新标签页观看 ↗</a></div>`
}

function videosPage() {
  return `<section class="page-heading"><span class="eyebrow">RESOURCE LIBRARY</span><h1>视频资源中心</h1><p>课程资源库中的真实公开课程。链接在新标签页打开，视频归原作者所有。</p></section><div class="resource-grid">${lessons.map(item=>`<article class="resource-card"><span class="content-tag">${esc(item.video.level)}</span><h3>${esc(item.title)}</h3><p>${esc(item.video.title)}</p><small>${esc(item.video.author)} · ${esc(item.video.source)}<br>对应：${esc(item.video.concept)}${item.video.segment?' · '+esc(item.video.segment):''}</small><a href="${esc(item.video.url)}" target="_blank" rel="noopener noreferrer">打开视频 ↗</a></article>`).join('')}</div>`
}

function labPage() {
  const tabs=[['token','Token'],['neuron','神经元'],['attention','注意力'],['rag','向量检索']]
  const [a,b,c,d,e]=labNumbers
  const n=neuron(a,b,c,d,e)
  const weights=softmax([a,b,c])
  const candidates=[[1,0],[0.7,0.7],[0,1]]
  const similarities=candidates.map(x=>cosine([a,b],x))
  return `<section class="page-heading"><span class="eyebrow">VISUAL LAB</span><h1>可视化实验室</h1><p>调整输入，观察实时计算。实验使用明确的教学公式和固定示例，不冒充商业模型输出。</p></section><div class="lab-tabs">${tabs.map(([id,label])=>`<button data-lab="${id}" class="${labMode===id?'active':''}">${label}</button>`).join('')}</div>
  <section class="lab-card">${labMode==='token' ? `<h2>文字怎样成为 Token？</h2><p>使用小型教学词表的实际字节合并算法。</p><label for="lab-text">输入短文字</label><input id="lab-text" maxlength="28" value="${esc(labText)}">${tokenLab(labText,labFrame)}</section>` :
  labMode==='neuron' ? `<h2>神经元计算</h2><p>z = x₁w₁ + x₂w₂ + b；输出 = sigmoid(z)。</p>${numberInputs(['输入 x₁','输入 x₂','权重 w₁','权重 w₂','偏置 b'],labNumbers)}<div class="calculation">z = ${n.sum.toFixed(3)}　→　sigmoid(z) = <strong>${n.output.toFixed(4)}</strong></div><div class="meter"><i style="width:${n.output*100}%"></i></div></section>` :
  labMode==='attention' ? `<h2>注意力权重</h2><p>输入三个分数，程序用数值稳定的 softmax 归一化。</p>${numberInputs(['分数 A','分数 B','分数 C'],labNumbers.slice(0,3))}<div class="calculation">${weights.map((v,i)=>`<div>${'ABC'[i]}：<strong>${(v*100).toFixed(1)}%</strong><div class="meter"><i style="width:${v*100}%"></i></div></div>`).join('')}</div><small>权重总和 = ${weights.reduce((x,y)=>x+y,0).toFixed(4)}</small></section>` :
  `<h2>向量相似度检索</h2><p>把查询向量与三个固定文档向量计算余弦相似度。相似不等于事实正确。</p>${numberInputs(['查询 X','查询 Y'],labNumbers.slice(0,2))}<div class="calculation">${similarities.map((v,i)=>`<div>文档 ${i+1} [${candidates[i].join(', ')}]：<strong>${v.toFixed(4)}</strong></div>`).join('')}</div><div class="info-box"><strong>检索结果</strong><p>最相似的是文档 ${similarities.indexOf(Math.max(...similarities))+1}。回答前仍需阅读原文和来源。</p></div></section>`}`
}
let labFrame=0
function numberInputs(labels,values) { return `<div class="number-grid">${labels.map((label,i)=>`<label>${label}<input type="number" step="0.1" min="-10" max="10" data-number="${i}" value="${values[i]}"></label>`).join('')}</div>` }

function dataPage() {
  const wrong=lessons.flatMap(item=>lessonProgress(progress,item.id).wrong.map(value=>({title:item.title,value})))
  const due=lessons.filter(item=>{ const p=lessonProgress(progress,item.id); return p.reviewAt && new Date(p.reviewAt)<=new Date() })
  return `<section class="page-heading"><span class="eyebrow">LEARNING INSIGHTS</span><h1>学习数据中心</h1><p>所有记录保存在当前浏览器。导出 JSON 可备份，导入可恢复。</p></section><section class="data-stats"><div><span>已完成</span><strong>${countDone()} / 12</strong></div><div><span>学习时间</span><strong>${Math.floor(progress.studySeconds/60)} 分钟</strong></div><div><span>待复习</span><strong>${due.length} 节</strong></div><div><span>错题记录</span><strong>${wrong.length} 次</strong></div></section>
  <section class="data-panel"><h2>知识点掌握程度</h2><div class="mastery-list">${lessons.map(item=>{const p=lessonProgress(progress,item.id);return `<div><span>${esc(item.title)}</span><div class="meter"><i style="width:${p.mastery}%"></i></div><b>${p.mastery}%</b>${p.reviewAt&&new Date(p.reviewAt)<=new Date()?'<small>该复习了</small>':''}</div>`}).join('')}</div></section>
  <section class="data-panel"><h2>错题本</h2>${wrong.length?wrong.map(x=>`<p><strong>${esc(x.title)}</strong>：${esc(x.value)}</p>`).join(''):'<p>暂无错题。完成课程练习后会自动记录。</p>'}</section>
  <section class="data-panel"><h2>备份与恢复</h2><p>导出文件只包含学习记录，不包含 API 密钥。</p><button class="next-button" data-action="export">下载学习记录 JSON</button><label class="import-label">导入学习记录 JSON<input id="import-progress" type="file" accept="application/json,.json"></label>${importError?`<p class="feedback incorrect" role="alert">${esc(importError)}</p>`:''}</section>`
}

function markdown(source) {
  const safe=esc(source)
  let inCode=false
  return safe.split('\n').map(line=>{
    if(line.startsWith('```')) {inCode=!inCode;return inCode?'<pre><code>':'</code></pre>'}
    if(inCode) return line+'\n'
    if (/^### /.test(line)) return '<h4>'+inline(line.slice(4))+'</h4>'
    if (/^## /.test(line)) return '<h3>'+inline(line.slice(3))+'</h3>'
    if (/^# /.test(line)) return '<h2>'+inline(line.slice(2))+'</h2>'
    if (/^[-*] /.test(line)) return '<p class="md-list">• '+inline(line.slice(2))+'</p>'
    if (/^\d+\. /.test(line)) return '<p class="md-list">'+inline(line)+'</p>'
    return '<p>'+inline(line||' ')+'</p>'
  }).join('')
}
function inline(line) {
  return line.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/`([^`]+)`/g,'<code>$1</code>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,'<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/\$\$([^$]+)\$\$|\$([^$]+)\$/g,(_,block,small)=>{
      const formula=(block||small).replaceAll('&amp;','&')
      return globalThis.katex ? globalThis.katex.renderToString(formula,{throwOnError:false,trust:false,displayMode:Boolean(block),output:'htmlAndMathml'}) : '<code>'+esc(formula)+'</code>'
    })
}
function tutorPage() {
  const item=lessonById[progress.activeLesson]||lessonById.token
  const configured=Boolean(globalThis.AI_LAB_API_URL)
  return `<section class="page-heading"><span class="eyebrow">AI TUTOR</span><h1>AI 互动导师</h1><p>当前课程：${esc(item.title)}。连接模型服务后可实时追问、流式阅读和随时停止。现在可使用离线预设引导。</p></section><div class="tutor-layout"><section class="chat-card"><div class="chat-history" id="chat-history">${chat.length?chat.map(m=>`<article class="chat-message ${m.role}"><strong>${m.role==='user'?'你':configured?'AI 导师':'预设引导'}</strong><div class="markdown">${markdown(m.content)}</div></article>`).join(''):'<div class="chat-empty">先选一个引导主题，再回到课程图解中亲手操作。</div>'}</div>${tutorError?`<p class="feedback incorrect" role="alert">${esc(tutorError)}</p>`:''}${!configured?'<div class="info-box"><strong>离线预设引导</strong><p>目前没有模型 API 密钥，下面的内容来自已审核课程。部署安全代理后将启用实时答疑。</p></div><div class="guide-actions"><button data-action="guide-basics">解释基础概念</button><button data-action="guide-case">举一个实际案例</button><button data-action="guide-frame">讲解当前图解步骤</button></div>':''}<form id="chat-form"><label for="chat-input">向导师提问</label><textarea id="chat-input" maxlength="2000" placeholder="例如：请用生活中的例子解释当前步骤" ${configured?'':'disabled'}></textarea><div class="chat-actions"><button class="next-button" type="submit" ${!configured||controller?'disabled':''}>发送提问</button><button class="control-button" type="button" data-action="stop-chat" ${controller?'':'disabled'}>停止生成</button></div></form></section><aside class="aside-card"><span class="eyebrow">LESSON CONTEXT</span><h3>${esc(item.title)}</h3><p>${esc(item.goal)}</p><small>当前步骤：${steps[lessonProgress(progress,item.id).step]}</small><button class="plain-link" data-go="lesson/${item.id}">返回本课 →</button></aside></div>`
}

function render() {
  const r=route()
  const body=r.page==='home'?home():r.page==='courses'?catalog():r.page==='lesson'&&lessonById[r.id]?lessonPage(lessonById[r.id]):r.page==='lab'?labPage():r.page==='videos'?videosPage():r.page==='data'?dataPage():r.page==='tutor'?tutorPage():home()
  root.innerHTML=layout(body)
  if (playing && r.page==='lesson') {
    clearTimeout(playTimer)
    const item=currentLesson(), state=lessonProgress(progress,item.id)
    if (state.frame>=item.frames.length-1) { stopPlay(); return }
    playTimer=setTimeout(()=>patchLesson(item.id,{frame:state.frame+1}),850)
  }
}

async function sendChat(message) {
  const item=lessonById[progress.activeLesson]||lessonById.token
  controller=new AbortController(); tutorError=''
  chat.push({role:'user',content:message},{role:'assistant',content:''}); render()
  try {
    const response=await fetch(globalThis.AI_LAB_API_URL,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({
      lessonId:item.id, step:lessonProgress(progress,item.id).step,
      messages:chat.slice(-12).filter(x=>x.content).map(x=>({role:x.role,content:x.content})),
    }),signal:controller.signal})
    if(!response.ok) throw new Error('导师服务返回 '+response.status)
    const reader=response.body.getReader(); const decoder=new TextDecoder(); let buffer=''
    while(true) {
      const {value,done}=await reader.read(); if(done) break
      buffer+=decoder.decode(value,{stream:true})
      const lines=buffer.split('\n'); buffer=lines.pop()
      for(const line of lines) {
        if(!line.startsWith('data: ')) continue
        const payload=line.slice(6); if(payload==='[DONE]') continue
        try { const data=JSON.parse(payload); chat.at(-1).content+=data.choices?.[0]?.delta?.content||'' } catch {}
      }
      render(); document.getElementById('chat-history')?.scrollTo(0,999999)
    }
  } catch(error) {
    if(error.name!=='AbortError') tutorError='连接失败：'+error.message
  } finally { controller=null; render() }
}

document.addEventListener('click', event=>{
  const target=event.target.closest?.('[data-go],[data-action],[data-answer],[data-step],[data-node],[data-token],[data-lab]')
  if(!target) return
  if(target.dataset.go) { stopPlay(); selectedNode=null; answer=null; go(target.dataset.go); return }
  if(target.dataset.lab) { labMode=target.dataset.lab; labFrame=0; render(); return }
  const r=route(), item=currentLesson(), state=item?lessonProgress(progress,item.id):null
  if(target.dataset.answer!==undefined) { answer=Number(target.dataset.answer); render(); return }
  if(target.dataset.node!==undefined) { selectedNode=Number(target.dataset.node); render(); return }
  if(target.dataset.step!==undefined&&item&&!target.disabled) { stopPlay(); selectedNode=null; patchLesson(item.id,{step:Number(target.dataset.step),frame:0}); return }
  if(target.dataset.token!==undefined) { const i=Number(target.dataset.token); const input=r.page==='lab'?labText:state.input||'AI learns'; const t=tokenizeWithFrames(input)[r.page==='lab'?labFrame:state.tokenFrame||0].tokens[i]; if(t) alert(`符号：${t.label}\n字节：${t.hex}\n教学词表 ID：${t.id}`); return }
  const action=target.dataset.action
  if(action==='continue'&&item) { stopPlay(); patchLesson(item.id,{step:Math.min(6,state.step+1),frame:0}); window.scrollTo(0,0) }
  if(action==='previous'&&item) { stopPlay(); patchLesson(item.id,{step:Math.max(0,state.step-1),frame:0}) }
  if(action==='review'&&item) patchLesson(item.id,{step:1})
  if((action==='prev-frame'||action==='next-frame')&&item) { stopPlay(); selectedNode=null; patchLesson(item.id,{frame:Math.max(0,Math.min(item.frames.length-1,state.frame+(action==='next-frame'?1:-1)))}) }
  if(action==='replay'&&item) { stopPlay(); playing=true; patchLesson(item.id,{frame:0}) }
  if(action==='token-prev'||action==='token-next'||action==='token-replay') {
    const input=r.page==='lab'?labText:state.input||'AI learns'
    const old=r.page==='lab'?labFrame:state.tokenFrame||0
    const next=action==='token-replay'?0:Math.max(0,Math.min(tokenizeWithFrames(input).length-1,old+(action==='token-next'?1:-1)))
    if(r.page==='lab') { labFrame=next; render() } else patchLesson(item.id,{tokenFrame:next})
  }
  if(action==='submit'&&item&&answer!==null) {
    const correct=answer===item.quiz.answer, chosen=item.quiz.options[answer]
    setProgress(markAnswer(progress,item.id,correct,chosen))
    answer=null; window.scrollTo(0,0)
  }
  if(action==='export') {
    const blob=new Blob([JSON.stringify(normalizeProgress(progress),null,2)],{type:'application/json'})
    const url=URL.createObjectURL(blob), a=document.createElement('a')
    a.href=url; a.download='ai-learning-lab-progress.json'; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000)
  }
  if(action==='stop-chat') controller?.abort()
  if(action?.startsWith('guide-')) {
    const current=lessonById[progress.activeLesson]||lessonById.token
    const index=lessonProgress(progress,current.id).frame
    const guides={
      'guide-basics':['解释基础概念',current.basics],
      'guide-case':['举一个实际案例',current.example],
      'guide-frame':['讲解当前图解步骤',current.frames[Math.min(index,current.frames.length-1)]],
    }
    if(guides[action]) { chat.push({role:'user',content:guides[action][0]},{role:'assistant',content:guides[action][1]});render() }
  }
})
document.addEventListener('keydown',event=>{
  if((event.key==='Enter'||event.key===' ')&&event.target.matches?.('.svg-node')) {event.preventDefault();event.target.click()}
})

document.addEventListener('input',event=>{
  const t=event.target, r=route()
  if(t.id==='question'&&r.page==='lesson'&&currentLesson()) { progress=updateLesson(progress,currentLesson().id,{question:t.value}); persist() }
  if(t.id==='lab-text') { labText=t.value; labFrame=0; render(); document.getElementById('lab-text')?.focus() }
  if(t.dataset.number!==undefined) { const i=Number(t.dataset.number); labNumbers[i]=Math.max(-10,Math.min(10,Number(t.value)||0)); render(); document.querySelector(`[data-number="${i}"]`)?.focus() }
})
document.addEventListener('submit',event=>{
  if(event.target.id!=='chat-form') return
  event.preventDefault()
  const input=document.getElementById('chat-input'), value=input?.value.trim()
  if(value&&globalThis.AI_LAB_API_URL&&!controller) sendChat(value)
})
document.addEventListener('change',async event=>{
  if(event.target.id!=='import-progress') return
  try {
    const file=event.target.files?.[0]; if(!file||file.size>2_000_000) throw new Error('文件为空或超过 2 MB')
    const data=JSON.parse(await file.text())
    if(data.version!==2||!data.lessons||typeof data.lessons!=='object') throw new Error('不是有效的 v2 学习记录')
    importError=''; setProgress(normalizeProgress(data))
  } catch(error) { importError=error.message; render() }
})
window.addEventListener('hashchange',()=>{stopPlay(); selectedNode=null; answer=null; render()})
window.addEventListener('beforeunload',()=>{progress.studySeconds+=Math.floor((Date.now()-lastTick)/1000);persist()})
if (typeof document.visibilityState === 'string') setInterval(()=>{if(document.visibilityState==='visible'){progress.studySeconds+=Math.floor((Date.now()-lastTick)/1000);persist()}lastTick=Date.now()},15000)
render()
