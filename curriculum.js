export const tracks = [
  { number: '01', title: '建立 AI 直觉', description: '先理解 AI 如何从数据中学习，再进入语言模型。', lessons: [
    ['ai-basics', '人工智能是什么', '任务、数据、模型与预测', [], false],
    ['ml-dl', '机器学习与深度学习', '训练、参数与神经网络', ['ai-basics'], false],
    ['token', 'Token：模型如何看文字', '亲手观察文字怎样变成符号', [], true],
    ['embedding-transformer', 'Embedding 与 Transformer', '从 Token 到上下文表示', ['token', 'ml-dl'], false],
  ]},
  { number: '02', title: '学会与模型协作', description: '理解提示词、上下文和构建 AI 应用的基本语言。', lessons: [
    ['prompt-context', 'Prompt 与上下文管理', '清晰任务与有限上下文', ['token'], false],
    ['programming', 'Python 与 JavaScript 基础', '变量、函数与数据流', [], false],
    ['web-basics', 'JSON、HTTP 与 API', '让程序互相通信', ['programming'], false],
    ['model-api', '模型 API 与 Function Calling', '请求模型并连接工具', ['prompt-context', 'web-basics'], false],
  ]},
  { number: '03', title: '构建智能系统', description: '让模型检索资料、使用工具并完成多步任务。', lessons: [
    ['agents', 'AI Agent、记忆与规划', '目标、状态、行动与反馈', ['model-api'], false],
    ['rag', 'RAG 与向量数据库', '检索资料后再回答', ['embedding-transformer', 'model-api'], false],
    ['mcp', 'MCP 与工具集成', '统一连接外部能力', ['agents', 'web-basics'], false],
    ['ship', 'Codex、GitHub 与部署', '开发、协作与上线', ['programming', 'agents'], false],
  ]},
]
export const titles = Object.fromEntries(tracks.flatMap(track => track.lessons.map(([id, title]) => [id, title])))
export const video = {
  title: 'Transformers, the tech behind LLMs | Deep Learning Chapter 5',
  author: '3Blue1Brown', source: 'YouTube',
  url: 'https://www.youtube.com/watch?v=wjZofJX0v4M',
  concept: '从 Token 进入 Transformer 的整体流程', level: '进阶拓展',
}
