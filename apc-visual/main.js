/* 主渲染逻辑（动态 API + SSE 热更新 + 热编辑 + 知识库目录切换） */

(function () {
  const graphEl = document.getElementById('structure-graph');
  const treeEl = document.getElementById('file-tree');
  const headerEl = document.getElementById('content-header');
  const bodyEl = document.getElementById('content-body');
  const editorEl = document.getElementById('editor');
  const editorBarEl = document.getElementById('editor-bar');
  const editorSplitEl = document.getElementById('editor-split');
  const editorPreviewEl = document.getElementById('editor-preview');
  const editorCharsEl = document.getElementById('editor-chars');
  const editorFileNameEl = document.getElementById('editor-file-name');
  const editorStatusEl = document.getElementById('editor-status');
  const editorSaveBtn = document.getElementById('editor-save');
  const editorCancelBtn = document.getElementById('editor-cancel');

  let TRUST = {};
  let FILES = [];
  let GRAPH = [];
  let currentId = null;
  let editing = false;
  let sseReconnectTimer = null;
  let metaLoadFailed = false;
  /* 单一数据源：当前正在编辑的原始 Markdown 文本。
     右侧编辑框与左侧预览都只是这份数据的两个视图。 */
  let draftContent = '';

  /* 全局状态横幅 */
  const banner = document.createElement('div');
  banner.className = 'status-banner';
  banner.style.display = 'none';
  document.body.prepend(banner);

  function showBanner(type, msg) {
    banner.className = 'status-banner ' + type;
    banner.innerHTML = msg;
    banner.style.display = 'block';
  }
  function hideBanner() {
    banner.style.display = 'none';
  }

  function trustLabel(t) {
    const info = TRUST[t] || TRUST.forensics;
    return info ? info.label : '';
  }
  function trustCls(t) {
    const info = TRUST[t] || TRUST.forensics;
    return info ? info.cls : '';
  }

  /* 空状态渲染 */
  function renderEmpty(container, msg) {
    container.innerHTML = `<div class="empty-state"><p>${msg}</p></div>`;
  }

  /* 渲染结构图 */
  function renderGraph() {
    if (!GRAPH.length) {
      renderEmpty(graphEl, '暂无结构数据<br>请在当前知识库目录添加 .md 文件');
      return;
    }
    graphEl.innerHTML = '';
    GRAPH.forEach(item => {
      if (item.arrow) {
        const div = document.createElement('div');
        div.className = 'graph-arrow';
        div.textContent = item.arrow;
        graphEl.appendChild(div);
        return;
      }
      const div = document.createElement('div');
      div.className = 'graph-node' + (item.id === currentId ? ' active' : '');
      div.dataset.id = item.id;
      div.innerHTML =
        `<span class="trust ${trustCls(item.trust)}">${trustLabel(item.trust)}</span>` +
        `<div class="g-name">${item.name}</div>` +
        `<div class="g-role">${item.role}</div>`;
      div.addEventListener('click', () => selectFile(item.id));
      graphEl.appendChild(div);
    });
  }

  /* 渲染文件树（按 group 分组：核心 / 其他 md） */
  function renderTree() {
    if (!FILES.length) {
      renderEmpty(treeEl, '未发现知识库文件<br>请检查当前目录下的 .apc');
      return;
    }
    treeEl.innerHTML = '';

    const groups = [
      { key: 'core', label: '核心知识库' },
      { key: 'other', label: '其他 md' }
    ];

    groups.forEach(g => {
      const items = FILES.filter(f => f.group === g.key);
      if (!items.length) return;

      const groupDiv = document.createElement('div');
      groupDiv.className = 'tree-group';

      const title = document.createElement('div');
      title.className = 'tree-group-title';
      title.textContent = g.label;
      const count = document.createElement('span');
      count.className = 'g-count';
      count.textContent = `(${items.length})`;
      title.appendChild(count);
      groupDiv.appendChild(title);

      const ul = document.createElement('ul');
      ul.className = 'file-tree';

      items.forEach(f => {
        const li = document.createElement('li');
        const div = document.createElement('div');
        div.className = 'tree-file' + (f.id === currentId ? ' active' : '');
        div.dataset.id = f.id;
        div.innerHTML =
          `<span class="f-trust ${trustCls(f.trust)}">${trustLabel(f.trust)}</span>` +
          `<span>${f.name}</span>`;
        div.addEventListener('click', () => selectFile(f.id));
        li.appendChild(div);
        ul.appendChild(li);
      });

      groupDiv.appendChild(ul);
      treeEl.appendChild(groupDiv);
    });
  }

  /* 编辑模式开关 */
  function setEditing(on) {
    editing = on;
    editorEl.hidden = !on;
    editorBarEl.hidden = !on;
    editorSplitEl.hidden = !on;
    bodyEl.hidden = on;
    // 全屏编辑模式：隐藏左右面板，编辑分屏占满视口
    document.body.classList.toggle('editing', on);
    if (!on && currentId) {
      // 退出编辑后回显渲染内容（若已保存则为成品，若取消则重新拉取原内容）
      selectFile(currentId);
    }
  }

  /* 选择文件 */
  async function selectFile(id) {
    if (editing) {
      // 编辑中切换文件：先取消编辑
      setEditing(false);
    }
    currentId = id;
    const file = FILES.find(f => f.id === id);
    if (!file) return;

    // 更新头部
    headerEl.innerHTML = '';
    const h3 = document.createElement('h3');
    h3.textContent = file.name;
    headerEl.appendChild(h3);

    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.innerHTML =
      `<span class="m-item">📁 ${file.path}</span>` +
      `<span class="m-item">◆ ${file.role}</span>` +
      `<span class="m-item trust ${trustCls(file.trust)}">${trustLabel(file.trust)}：${file.trustNote}</span>` +
      `<span class="m-item"><button class="btn btn-ghost edit-btn" id="edit-btn" title="编辑此文件">✏️ 编辑</button></span>`;
    headerEl.appendChild(meta);

    // 从 API 拉取内容
    bodyEl.innerHTML = '<p style="color:var(--muted)">加载中…</p>';
    try {
      const res = await fetch(`/api/content?id=${encodeURIComponent(id)}`);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      // 防止快速切换时旧请求覆盖
      if (currentId !== id) return;
      bodyEl.innerHTML = (data.content || '').trim()
        ? renderMarkdown(data.content)
        : '<div class="empty-state"><p>⚠ 文件内容为空</p></div>';

      // 编辑按钮
      const editBtn = document.getElementById('edit-btn');
      if (editBtn) {
        editBtn.addEventListener('click', () => enterEditMode(file, data.content || ''));
      }
    } catch (e) {
      if (currentId === id) {
        bodyEl.innerHTML =
          `<div class="empty-state"><p>⚠ 无法加载 ${file.name}</p>` +
          `<p class="sub">${e.message} · 请确认文件存在且服务器可读</p></div>`;
      }
    }

    // 高亮激活节点
    document.querySelectorAll('.graph-node, .tree-file').forEach(el => {
      el.classList.toggle('active', el.dataset.id === id);
    });
  }

  /* 渲染 Markdown 到预览区：直接读取单一数据源 draftContent */
  function updatePreview() {
    const text = draftContent || '';
    const trimmed = text.trim();
    editorPreviewEl.innerHTML = trimmed
      ? renderMarkdown(text)
      : '<div class="empty-state"><p>📝 草稿为空</p><p class="sub">在右侧输入 Markdown 后，此处实时预览成品效果</p></div>';
    // 字数统计（中英文混合计数）
    const chars = trimmed ? text.replace(/\s/g, '').length : 0;
    editorCharsEl.textContent = `${chars} 字 · ${text.length} 字符`;
  }

  /* 进入编辑模式：
     1) 把已保存的原始内容立即赋给单一数据源 draftContent（绝不留空）
     2) 右侧编辑框只是 draftContent 的视图，同步 value
     3) 左侧预览直接读 draftContent，立刻渲染 */
  function enterEditMode(file, content) {
    draftContent = content || '';
    editorEl.value = draftContent;
    editorFileNameEl.textContent = file.name;
    editorStatusEl.textContent = `编辑模式 · 保存将覆盖 ${file.name} 完整内容`;
    setEditing(true);
    updatePreview();
    editorEl.focus();
  }

  /* 保存编辑：一键保存草稿并更新成品 */
  async function saveEdit() {
    if (!currentId) return;
    const saveBtn = editorSaveBtn;
    const oldText = saveBtn.textContent;
    saveBtn.disabled = true;
    saveBtn.textContent = '保存中…';
    try {
      const res = await fetch('/api/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: currentId, content: draftContent })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || ('HTTP ' + res.status));
      }
      setEditing(false);
      const fname = FILES.find(f => f.id === currentId)?.name || '';
      showBanner('info', `✓ 已覆盖保存 ${fname}，成品已更新`);
      // 触发重新加载（SSE 也会收到，但这里主动刷新避免等待）
      setTimeout(() => {
        hideBanner();
        loadMeta();
      }, 300);
    } catch (e) {
      showBanner('error', `⚠ 保存失败：${e.message}`);
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = oldText;
    }
  }

  /* 从 API 拉取元数据 */
  async function loadMeta() {
    try {
      const res = await fetch('/api/meta');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();

      // 校验响应结构
      if (!data || typeof data !== 'object' || !Array.isArray(data.files)) {
        throw new Error('响应格式不正确');
      }

      TRUST = data.trust || {};
      FILES = data.files || [];
      GRAPH = data.graph || [];
      metaLoadFailed = false;
      hideBanner();

      // 更新顶栏目录名
      const dirNameEl = document.getElementById('dir-name');
      if (dirNameEl && data.dir) {
        dirNameEl.textContent = data.dir;
        dirNameEl.title = data.dir;
      }

      // 保持当前选中的文件（若仍存在）
      const stillExists = FILES.some(f => f.id === currentId);
      if (!stillExists) currentId = null;

      renderGraph();
      renderTree();

      if (!currentId) {
        currentId = FILES.length ? FILES[0].id : null;
      }
      if (currentId) selectFile(currentId);
      else {
        headerEl.innerHTML = '';
        bodyEl.innerHTML =
          `<div class="empty-state"><p>📭 知识库为空</p>` +
          `<p class="sub">当前目录下没有 .md 文件，请选择其他知识库目录</p></div>`;
      }
    } catch (e) {
      console.error('加载元数据失败:', e);
      metaLoadFailed = true;
      showBanner('error',
        `⚠ <b>无法连接知识库服务器</b><br>` +
        `<span class="sub">请确认已运行 <code>node apc-visual/server.js</code> 或双击 <code>start.bat</code> 启动<br>` +
        `错误信息: ${e.message}</span>`);
      renderEmpty(graphEl, '加载失败<br>请先启动服务器');
      renderEmpty(treeEl, '加载失败<br>请先启动服务器');
      bodyEl.innerHTML =
        `<div class="empty-state"><p>⚠ 无法加载知识库</p>` +
        `<p class="sub">服务器未响应，请运行 <code>npm start</code> 或 <code>start.bat</code> 后刷新页面</p></div>`;
    }
  }

  /* ---------- 知识库目录切换 ---------- */
  const dirWrap = document.getElementById('dir-wrap');
  const dirBtn = document.getElementById('dir-btn');
  const dirMenu = document.getElementById('dir-menu');
  const dirList = document.getElementById('dir-list');
  const dirInput = document.getElementById('dir-input');
  const dirAddBtn = document.getElementById('dir-add-btn');
  let dirsCache = [];

  async function loadDirs() {
    try {
      const res = await fetch('/api/dirs');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      dirsCache = data.dirs || [];
      renderDirList();
    } catch (e) {
      console.error('加载目录列表失败:', e);
    }
  }

  function renderDirList() {
    dirList.innerHTML = '';
    if (!dirsCache.length) {
      dirList.innerHTML = '<div class="dir-empty">未扫描到知识库目录<br>可手动输入路径添加</div>';
      return;
    }
    dirsCache.forEach(d => {
      const item = document.createElement('div');
      item.className = 'dir-item';
      item.dataset.path = d.path;
      const active = d.path === currentDirPath();
      if (active) item.classList.add('active');
      item.innerHTML =
        `<span class="d-name">${escapeHtml(d.name)}</span>` +
        (active ? '<span class="d-check">✓</span>' : '');
      item.addEventListener('click', () => switchDir(d.path));
      dirList.appendChild(item);
    });
  }

  function currentDirPath() {
    const name = document.getElementById('dir-name');
    return name ? name.title : '';
  }

  async function switchDir(path) {
    try {
      const res = await fetch('/api/dirs/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || ('HTTP ' + res.status));
      }
      const data = await res.json();
      // 更新顶栏显示
      const dirNameEl = document.getElementById('dir-name');
      if (dirNameEl) {
        dirNameEl.textContent = data.dir;
        dirNameEl.title = data.dir;
      }
      closeDirMenu();
      currentId = null;
      showBanner('info', `📚 已切换到知识库：${data.dir}`);
      loadDirs();
      loadMeta();
      setTimeout(() => hideBanner(), 1500);
    } catch (e) {
      showBanner('error', `⚠ 切换失败：${e.message}`);
      setTimeout(() => hideBanner(), 3000);
    }
  }

  async function addDir() {
    const val = dirInput.value.trim();
    if (!val) return;
    await switchDir(val);
    dirInput.value = '';
  }

  function openDirMenu() {
    loadDirs();
    dirMenu.classList.add('open');
  }
  function closeDirMenu() {
    dirMenu.classList.remove('open');
  }

  dirBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (dirMenu.classList.contains('open')) closeDirMenu();
    else openDirMenu();
  });

  document.addEventListener('click', (e) => {
    if (!dirMenu.classList.contains('open')) return;
    if (!dirWrap.contains(e.target)) closeDirMenu();
  });

  dirAddBtn.addEventListener('click', addDir);
  dirInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addDir();
  });

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '"');
  }

  /* SSE 热更新监听（带自动重连与状态提示） */
  function connectSSE() {
    const es = new EventSource('/events');

    es.onopen = () => {
      if (sseReconnectTimer) { clearTimeout(sseReconnectTimer); sseReconnectTimer = null; }
      if (metaLoadFailed) loadMeta(); // 重连成功后刷新数据
      else hideBanner();
    };

    es.addEventListener('files-changed', (e) => {
      try {
        const data = JSON.parse(e.data);
        console.log(`[SSE] 文件变化: ${data.file}，重新加载元数据…`);
        // 编辑模式下不打断用户输入
        if (!editing) {
          showBanner('info', `↻ 检测到 ${data.file} 变化，正在刷新…`);
          loadMeta();
        }
      } catch (err) {
        console.error('SSE 消息解析失败:', err);
      }
    });

    es.onerror = () => {
      if (!sseReconnectTimer && !metaLoadFailed) {
        showBanner('warn', '↻ 热更新连接断开，正在自动重连…');
      }
      if (!sseReconnectTimer) {
        sseReconnectTimer = setTimeout(() => {
          if (es.readyState !== EventSource.OPEN) {
            showBanner('warn', '热更新连接已断开，请刷新页面或重启服务器');
          }
          sseReconnectTimer = null;
        }, 5000);
      }
    };
  }

  /* 面板折叠 */
  function setupCollapse() {
    document.querySelectorAll('.collapse-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const panel = document.getElementById(btn.dataset.panel);
        const layout = document.querySelector('.layout');
        if (!panel) return;

        const collapsed = panel.classList.toggle('collapsed');
        btn.textContent = collapsed ? '+' : '−';
        btn.title = collapsed ? '展开' : '折叠';

        if (panel.id === 'structure-panel') {
          layout.classList.toggle('collapse-structure', collapsed);
        } else if (panel.id === 'tree-panel') {
          layout.classList.toggle('collapse-tree', collapsed);
        }
      });
    });
  }

  /* ===== 主题与设置 ===== */
  const THEME_KEY = 'apc-visual-theme';
  const themeOptions = document.getElementById('theme-options');

  // 读取本地存储的主题偏好（默认跟随系统）
  function getSavedTheme() {
    try {
      return localStorage.getItem(THEME_KEY) || 'system';
    } catch (e) {
      return 'system';
    }
  }

  // 应用主题：设置 data-theme 属性
  function applyTheme(value) {
    document.documentElement.dataset.theme = value;
    document.querySelectorAll('.theme-option').forEach(opt => {
      opt.classList.toggle('active', opt.dataset.themeValue === value);
    });
  }

  // 保存偏好并应用
  function setTheme(value) {
    applyTheme(value);
    try {
      localStorage.setItem(THEME_KEY, value);
    } catch (e) {
      // 忽略存储失败
    }
  }

  // 主题切换事件
  themeOptions.addEventListener('click', (e) => {
    const btn = e.target.closest('.theme-option');
    if (!btn) return;
    setTheme(btn.dataset.themeValue);
  });

  // 设置菜单开合
  const settingsBtn = document.getElementById('settings-btn');
  const settingsMenu = document.getElementById('settings-menu');

  settingsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    settingsMenu.classList.toggle('open');
  });

  // 点击菜单外关闭
  document.addEventListener('click', (e) => {
    if (!settingsMenu.classList.contains('open')) return;
    if (!settingsMenu.contains(e.target)) {
      settingsMenu.classList.remove('open');
    }
  });

  // 初始化主题
  applyTheme(getSavedTheme());

  // 编辑器事件
  // 每次按键：新值立即写回单一数据源 draftContent，再立即重渲染预览（无防抖/节流）
  editorEl.addEventListener('input', () => {
    draftContent = editorEl.value;
    updatePreview();
  });
  editorSaveBtn.addEventListener('click', saveEdit);
  editorCancelBtn.addEventListener('click', () => {
    setEditing(false);
    // 重新加载当前文件，丢弃未保存修改
    if (currentId) selectFile(currentId);
  });
  // Ctrl+S 保存
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      if (editing) {
        e.preventDefault();
        saveEdit();
      }
    }
  });

  /* 初始化 */
  setupCollapse();
  loadDirs();
  loadMeta();
  connectSSE();
})();
