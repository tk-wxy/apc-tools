/* APC 知识库热读取/热编辑服务器（零依赖 Node.js）
 * - GET  /api/dirs           列出可用知识库目录
 * - POST /api/dirs/select    切换当前知识库目录 { path }
 * - GET  /api/meta           返回当前目录文件元数据（动态扫描 .apc）
 * - GET  /api/content?id=    返回单个文件 markdown 内容
 * - POST /api/content        保存单个文件 markdown 内容 { id, content }
 * - GET  /events             SSE 推送文件变化事件
 * - 静态托管 apc-visual 下文件
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname);
const BASE = path.join(ROOT, '..');
const CONFIG_FILE = path.join(ROOT, '.apc-config.json');
const PORT = process.env.PORT || 3000;

/* ---------- 当前知识库目录 ---------- */
let APC_DIR = null;

function defaultApcDir() {
  // 1) 读取配置文件记住的目录
  try {
    const cfg = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    if (cfg.current && fs.existsSync(cfg.current)) return cfg.current;
  } catch (e) {}
  // 2) 默认 apc/.apc
  const p = path.join(BASE, 'apc', '.apc');
  if (fs.existsSync(p)) return p;
  // 3) 任意扫描到的第一个 .apc
  const dirs = scanApcDirs();
  return dirs.length ? dirs[0].path : null;
}

function saveConfig() {
  try {
    const cfg = { current: APC_DIR, custom: getCustomDirs() };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf-8');
  } catch (e) {
    console.warn('⚠ 保存配置失败:', e.message);
  }
}

/* ---------- 目录扫描 ---------- */
let customDirs = [];
function loadCustomDirs() {
  try {
    const cfg = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    customDirs = (cfg.custom || []).filter(d => fs.existsSync(d));
  } catch (e) {
    customDirs = [];
  }
}
function getCustomDirs() { return customDirs; }

/* 扫描 BASE 下深度 ≤2 的所有 .apc 目录（排除无关目录） */
function scanApcDirs() {
  const results = [];
  const seen = new Set();

  function walk(dir, depth) {
    if (depth > 2) return;
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return; }
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      if (e.name === 'node_modules' || e.name === '.git' || e.name === 'apc-visual') continue;
      const full = path.join(dir, e.name);
      if (e.name === '.apc') {
        let real;
        try { real = fs.realpathSync(full); } catch (err) { continue; }
        if (!seen.has(real)) {
          seen.add(real);
          results.push({ path: full, name: path.basename(dir) + '/.apc' });
        }
      } else {
        walk(full, depth + 1);
      }
    }
  }

  walk(BASE, 1);

  // 附加用户手动添加的目录
  customDirs.forEach(d => {
    let real;
    try { real = fs.realpathSync(d); } catch (e) { return; }
    if (!seen.has(real)) {
      seen.add(real);
      results.push({ path: d, name: path.basename(d) });
    }
  });
  return results;
}

/* 解析用户输入的路径：允许直接指向 .apc 或项目根目录 */
function resolveApcPath(input) {
  if (!input) return null;
  let p = input.trim();
  try { p = path.resolve(p); } catch (e) { return null; }
  if (!fs.existsSync(p)) return null;
  const stat = fs.statSync(p);
  if (stat.isFile()) return null;
  // 若指向项目根目录，自动拼接 .apc
  if (path.basename(p) !== '.apc') {
    const sub = path.join(p, '.apc');
    if (fs.existsSync(sub) && fs.statSync(sub).isDirectory()) p = sub;
  }
  return fs.existsSync(p) && fs.statSync(p).isDirectory() ? p : null;
}

/* ---------- 启动前检查 ---------- */
function checkEnvironment() {
  console.log('── APC 知识库热读取/热编辑服务器 ──');
  console.log(`  工作目录: ${ROOT}`);
  if (!APC_DIR) {
    console.warn('\n⚠ 未找到任何知识库目录 (.apc)');
    console.warn('  请在 apc-visual 界面顶部选择或添加一个含 .apc 的目录\n');
    return false;
  }
  const count = fs.existsSync(APC_DIR)
    ? fs.readdirSync(APC_DIR).filter(f => f.endsWith('.md')).length
    : 0;
  console.log(`  知识库目录: ${APC_DIR}`);
  console.log(`  ✓ 共 ${count} 个 .md 文件`);
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
  if (!APC_DIR || !fs.existsSync(APC_DIR)) return [];
  try {
    return fs.readdirSync(APC_DIR).filter(f => f.endsWith('.md'));
  } catch (e) {
    console.error('读取知识库目录失败:', e.message);
    return [];
  }
}

/* 文件相对工具目录的展示路径 */
function relPath(name) {
  return APC_DIR ? path.relative(ROOT, path.join(APC_DIR, name)) : name;
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
        path: relPath(t.name),
        role: t.role,
        trust: t.trust,
        trustNote: t.trustNote,
        group: 'core'
      });
    }
  }
  // 目录中存在但模板未定义的额外文件 → 归入「其他 md」分组
  const known = new Set(Object.values(META_TEMPLATE).map(t => t.name));
  existing.forEach(f => {
    if (!known.has(f)) {
      files.push({
        id: 'extra-' + f.replace(/\.md$/, ''),
        name: f,
        path: relPath(f),
        role: '扩展文件',
        trust: 'low',
        trustNote: '未在核心模板中定义',
        group: 'other'
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

function writeContent(id, content) {
  const files = buildFiles();
  const f = files.find(x => x.id === id);
  if (!f) return { ok: false, error: 'not found' };
  const fp = path.join(APC_DIR, f.name);
  try {
    fs.writeFileSync(fp, content, 'utf-8');
    return { ok: true };
  } catch (e) {
    console.error(`写入 ${f.name} 失败:`, e.message);
    return { ok: false, error: e.message };
  }
}

/* ---------- SSE 客户端 ---------- */
let sseClients = new Set();

function broadcast(type, payload) {
  const data = `event: ${type}\ndata: ${JSON.stringify(payload)}\n\n`;
  sseClients.forEach(res => { try { res.write(data); } catch (e) {} });
}

/* 监听当前 .apc 目录变化（目录切换时重建） */
let watcher = null;
function stopWatcher() {
  if (watcher) { try { watcher.close(); } catch (e) {} watcher = null; }
}
function startWatcher() {
  stopWatcher();
  if (!APC_DIR || !fs.existsSync(APC_DIR)) {
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
    console.log('  ✓ 目录监听已启用: ' + APC_DIR);
  } catch (e) {
    console.warn('⚠ 无法监听目录变化:', e.message);
  }
}

/* ---------- 请求体解析 ---------- */
function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', c => {
      body += c;
      if (body.length > 5 * 1024 * 1024) {
        reject(new Error('请求体过大'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
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

function sendJSON(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}

/* ---------- HTTP 服务 ---------- */
const server = http.createServer(async (req, res) => {
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

  // API：可用知识库目录列表
  if (p === '/api/dirs') {
    const dirs = scanApcDirs();
    sendJSON(res, 200, {
      dirs,
      current: APC_DIR
    });
    return;
  }

  // API：切换当前知识库目录
  if (p === '/api/dirs/select' && req.method === 'POST') {
    try {
      const body = await readBody(req);
      const data = JSON.parse(body || '{}');
      const target = resolveApcPath(data.path);
      if (!target) {
        sendJSON(res, 400, { error: '目录不存在或不是有效知识库（需包含 .apc）', input: data.path });
        return;
      }
      APC_DIR = target;
      // 记录到自定义目录（若不在扫描范围内）
      if (!scanApcDirs().some(d => d.path === target)) {
        if (!customDirs.includes(target)) customDirs.push(target);
      }
      saveConfig();
      startWatcher();
      sendJSON(res, 200, { ok: true, dir: APC_DIR });
    } catch (e) {
      sendJSON(res, 400, { error: e.message });
    }
    return;
  }

  // API：元数据 + 结构图
  if (p === '/api/meta') {
    sendJSON(res, 200, {
      dir: APC_DIR,
      files: buildFiles(),
      graph: buildGraph(),
      trust: TRUST
    });
    return;
  }

  // API：单个文件内容（GET 读取 / POST 保存）
  if (p === '/api/content') {
    if (req.method === 'POST') {
      try {
        const body = await readBody(req);
        const data = JSON.parse(body || '{}');
        if (!data.id) {
          sendJSON(res, 400, { error: '缺少 id 参数' });
          return;
        }
        const result = writeContent(data.id, typeof data.content === 'string' ? data.content : '');
        if (!result.ok) {
          sendJSON(res, 404, { error: result.error || 'not found', id: data.id });
          return;
        }
        // 广播热更新（其他客户端同步刷新）
        broadcast('files-changed', { file: data.id });
        sendJSON(res, 200, { ok: true });
      } catch (e) {
        sendJSON(res, 400, { error: e.message });
      }
      return;
    }

    const id = url.searchParams.get('id');
    if (!id) {
      sendJSON(res, 400, { error: '缺少 id 参数' });
      return;
    }
    const content = readContent(id);
    if (content === null) {
      sendJSON(res, 404, { error: '文件不存在', id });
      return;
    }
    sendJSON(res, 200, { id, content });
    return;
  }

  /* ---------- 静态文件托管 ---------- */
  let filePath;
  if (p === '/') {
    filePath = path.join(ROOT, 'index.html');
  } else {
    filePath = path.join(ROOT, path.normalize(p).replace(/^(\.\.[/\\])+/, ''));
    if (!filePath.startsWith(ROOT)) {
      sendJSON(res, 403, { error: '禁止访问' });
      return;
    }
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': 'no-cache'
    });
    res.end(data);
  });
});

/* ---------- 启动 ---------- */
loadCustomDirs();
APC_DIR = defaultApcDir();
checkEnvironment();
startWatcher();

server.listen(PORT, () => {
  console.log(`\n  ➜  http://localhost:${PORT}`);
  console.log(`  ➜  Ctrl+C 停止服务器\n`);
});
