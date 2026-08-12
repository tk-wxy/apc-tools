/* APC 知识库热读取服务器（零依赖 Node.js）
 * - GET  /api/meta     返回文件元数据（动态扫描 .apc 目录）
 * - GET  /api/content  返回单个文件 markdown 内容 ?id=xxx
 * - GET  /events       SSE 推送文件变化事件
 * - 静态托管 apc-visual 下文件
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname);
const APC_DIR = path.join(__dirname, '..', 'apc', '.apc');
const PORT = process.env.PORT || 3000;

/* ---------- 启动前检查 ---------- */
function checkEnvironment() {
  console.log('── APC 知识库热读取服务器 ──');
  console.log(`  工作目录: ${ROOT}`);
  console.log(`  知识库目录: ${APC_DIR}`);

  if (!fs.existsSync(APC_DIR)) {
    console.warn('\n⚠ 警告: 未找到知识库目录 apc/.apc/');
    console.warn('  已尝试路径: ' + APC_DIR);
    console.warn('  请确认目录结构正确，否则知识库将显示为空。\n');
    return false;
  }
  const count = fs.readdirSync(APC_DIR).filter(f => f.endsWith('.md')).length;
  console.log(`  ✓ 知识库目录存在，共 ${count} 个 .md 文件`);
  return count > 0;
}

/* 元数据模板：id -> 描述信息（人工维护） */
const META_TEMPLATE = {
  manifest: { name: 'manifest.md', role: '项目宪法：使命、技术栈、不变量、高风险区', trust: 'high', trustNote: '初始化并经人工确认后高信任；项目锚点' },
  workflow: { name: 'workflow.md', role: '开发协议：启动、执行、收尾流程（唯一事实来源）', trust: 'high', trustNote: '规范性文件' },
  rules:    { name: 'rules.md',    role: '有适用范围的坑、死路、症状索引', trust: 'high', trustNote: '当证据、适用范围、环境与状态匹配时高信任' },
  decisions:{ name: 'decisions.md', role: '已采用的选择、根因、被拒方案', trust: 'high', trustNote: '在记录的适用范围内高信任' },
  memory:   { name: 'memory.md',   role: '当前状态快照 + 最近 ≤3 次会话', trust: 'low', trustNote: '低信任；用作线索，使用前需核对源码' },
  history:  { name: 'history.md',  role: '归档：超出滚动窗口的旧会话', trust: 'forensics', trustNote: '默认不读取；仅在需要取证时 grep' },
  garden:   { name: 'garden.md',   role: '知识库定期维护：人类触发的园艺提示词', trust: 'forensics', trustNote: '用户触发才读取；正常启动不读取' },
  init:     { name: 'init.md',     role: '初始化协议：一次性运行，覆盖正常启动', trust: 'high', trustNote: '初始化完成后会移除' }
};

const TRUST = {
  high: { label: '高信任', cls: 'trust-high' },
  low: { label: '低信任', cls: 'trust-low' },
  forensics: { label: '取证用', cls: 'trust-forensics' }
};

const GRAPH_TEMPLATE = [
  { id: 'manifest', name: 'manifest.md', role: '项目锚点 · 冷启动第一站', trust: 'high' },
  { arrow: '▼ 冷启动路由 ▼' },
  { id: 'workflow', name: 'workflow.md', role: '开发协议 · 唯一事实来源', trust: 'high' },
  { id: 'rules', name: 'rules.md', role: '坑与死路 · 症状索引', trust: 'high' },
  { id: 'decisions', name: 'decisions.md', role: '决策与根因', trust: 'high' },
  { id: 'memory', name: 'memory.md', role: '当前状态 · 最近会话', trust: 'low' },
  { arrow: '▼ 归档流向 ▼' },
  { id: 'history', name: 'history.md', role: '旧会话归档', trust: 'forensics' },
  { id: 'garden', name: 'garden.md', role: '定期维护 · 人工触发', trust: 'forensics' },
  { arrow: '▼ 一次性文件（初始化后移除）▼' },
  { id: 'init', name: 'init.md', role: '初始化协议', trust: 'high' }
];

/* ---------- 动态读取 ---------- */
function listApcFiles() {
  if (!fs.existsSync(APC_DIR)) return [];
  try {
    return fs.readdirSync(APC_DIR).filter(f => f.endsWith('.md'));
  } catch (e) {
    console.error('读取知识库目录失败:', e.message);
    return [];
  }
}

function buildFiles() {
  const existing = listApcFiles();
  const files = [];
  for (const id of Object.keys(META_TEMPLATE)) {
    const t = META_TEMPLATE[id];
    if (existing.includes(t.name)) {
      files.push({
        id,
        name: t.name,
        path: 'apc/.apc/' + t.name,
        role: t.role,
        trust: t.trust,
        trustNote: t.trustNote
      });
    }
  }
  // 添加目录中存在但模板未定义的额外文件
  const known = new Set(Object.values(META_TEMPLATE).map(t => t.name));
  existing.forEach(f => {
    if (!known.has(f)) {
      files.push({
        id: 'extra-' + f.replace(/\.md$/, ''),
        name: f,
        path: 'apc/.apc/' + f,
        role: '扩展文件',
        trust: 'low',
        trustNote: '未在元数据模板中定义'
      });
    }
  });
  return files;
}

function buildGraph() {
  const existing = new Set(listApcFiles());
  return GRAPH_TEMPLATE.filter(item =>
    item.arrow || existing.has(item.name)
  );
}

function readContent(id) {
  const files = buildFiles();
  const f = files.find(x => x.id === id);
  if (!f) return null;
  const fp = path.join(APC_DIR, f.name);
  if (!fs.existsSync(fp)) return null;
  try {
    return fs.readFileSync(fp, 'utf-8');
  } catch (e) {
    console.error(`读取 ${f.name} 失败:`, e.message);
    return null;
  }
}

/* ---------- SSE 客户端 ---------- */
let sseClients = new Set();

function broadcast(type, payload) {
  const data = `event: ${type}\ndata: ${JSON.stringify(payload)}\n\n`;
  sseClients.forEach(res => { try { res.write(data); } catch (e) {} });
}

/* 监听 .apc 目录变化 */
let watcher = null;
function startWatcher() {
  if (watcher) return;
  if (!fs.existsSync(APC_DIR)) {
    console.warn('⚠ 无法监听目录变化: 知识库目录不存在');
    return;
  }
  let debounce = null;
  try {
    watcher = fs.watch(APC_DIR, (event, filename) => {
      if (!filename || !filename.endsWith('.md')) return;
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        console.log(`[watch] ${event}: ${filename}`);
        broadcast('files-changed', { file: filename });
      }, 200);
    });
    console.log('  ✓ 目录监听已启用');
  } catch (e) {
    console.warn('⚠ 无法监听目录变化:', e.message);
  }
}

/* ---------- MIME ---------- */
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.md': 'text/markdown; charset=utf-8'
};

/* ---------- HTTP 服务 ---------- */
const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const p = url.pathname;

  // SSE 事件流
  if (p === '/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    res.write(': connected\n\n');
    sseClients.add(res);
    req.on('close', () => sseClients.delete(res));
    return;
  }

  // API：元数据 + 结构图
  if (p === '/api/meta') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ files: buildFiles(), graph: buildGraph(), trust: TRUST }));
    return;
  }

  // API：单个文件内容
  if (p === '/api/content') {
    const id = url.searchParams.get('id');
    if (!id) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: '缺少 id 参数' }));
      return;
    }
    const content = readContent(id);
    if (content === null) {
      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'not found', id }));
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(content);
    return;
  }

  // 静态文件
  let filePath = path.join(ROOT, p === '/' ? 'index.html' : p);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(ROOT, 'index.html');
  }
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n✖ 启动失败: 端口 ${PORT} 已被占用`);
    console.error(`  可能原因: 服务器已在运行，或其他程序占用该端口`);
    console.error(`  解决办法:`);
    console.error(`    1. 若已运行，直接访问 http://localhost:${PORT} 即可`);
    console.error(`    2. 关闭占用端口的程序后重试`);
    console.error(`    3. 指定其他端口启动: set PORT=8080 && node server.js\n`);
  } else if (err.code === 'EACCES') {
    console.error(`\n✖ 启动失败: 没有权限监听端口 ${PORT}`);
    console.error(`  解决办法: 尝试使用其他端口，如 set PORT=8080 && node server.js\n`);
  } else {
    console.error(`\n✖ 启动失败: ${err.message}`);
    console.error(`  错误代码: ${err.code || '未知'}`);
    console.error(`  请检查 Node.js 环境是否正常\n`);
  }
  process.exit(1);
});

server.listen(PORT, () => {
  console.log(`\n✓ 服务器已启动: http://localhost:${PORT}`);
  console.log(`  API 元数据:  http://localhost:${PORT}/api/meta`);
  console.log(`  API 内容:    http://localhost:${PORT}/api/content?id=manifest`);
  console.log(`  SSE 热更新:  http://localhost:${PORT}/events`);
  console.log(`  按 Ctrl+C 停止服务\n`);
  startWatcher();
});

process.on('SIGINT', () => {
  console.log('\n正在关闭服务器…');
  if (watcher) { try { watcher.close(); } catch (e) {} }
  sseClients.forEach(res => { try { res.end(); } catch (e) {} });
  server.close(() => process.exit(0));
});

/* 启动 */
checkEnvironment();