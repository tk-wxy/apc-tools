/* 主渲染逻辑（动态 API + SSE 热更新） */

(function () {
  const graphEl = document.getElementById('structure-graph');
  const treeEl = document.getElementById('file-tree');
  const headerEl = document.getElementById('content-header');
  const bodyEl = document.getElementById('content-body');

  let TRUST = {};
  let FILES = [];
  let GRAPH = [];
  let currentId = null;
  let sseReconnectTimer = null;
  let metaLoadFailed = false;

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
      renderEmpty(graphEl, '暂无结构数据<br>请在 <code>apc/.apc/</code> 添加 .md 文件');
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

  /* 渲染文件树 */
  function renderTree() {
    if (!FILES.length) {
      renderEmpty(treeEl, '未发现知识库文件<br>请检查 <code>apc/.apc/</code> 目录');
      return;
    }
    treeEl.innerHTML = '';
    FILES.forEach(f => {
      const li = document.createElement('li');
      const div = document.createElement('div');
      div.className = 'tree-file' + (f.id === currentId ? ' active' : '');
      div.dataset.id = f.id;
      div.innerHTML =
        `<span class="f-trust ${trustCls(f.trust)}">${trustLabel(f.trust)}</span>` +
        `<span>${f.name}</span>`;
      div.addEventListener('click', () => selectFile(f.id));
      li.appendChild(div);
      treeEl.appendChild(li);
    });
  }

  /* 选择文件 */
  async function selectFile(id) {
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
      `<span class="m-item trust ${trustCls(file.trust)}">${trustLabel(file.trust)}：${file.trustNote}</span>`;
    headerEl.appendChild(meta);

    // 从 API 拉取内容
    bodyEl.innerHTML = '<p style="color:var(--muted)">加载中…</p>';
    try {
      const res = await fetch(`/api/content?id=${encodeURIComponent(id)}`);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const content = await res.text();
      // 防止快速切换时旧请求覆盖
      if (currentId !== id) return;
      bodyEl.innerHTML = content.trim()
        ? renderMarkdown(content)
        : '<div class="empty-state"><p>⚠ 文件内容为空</p></div>';
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
          `<p class="sub">尚未在 <code>apc/.apc/</code> 目录创建任何 .md 文件</p></div>`;
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
        showBanner('info', `↻ 检测到 ${data.file} 变化，正在刷新…`);
        loadMeta();
      } catch (err) {
        console.error('SSE 消息解析失败:', err);
      }
    });

    es.onerror = () => {
      // EventSource 断开时显示提示（自动重连）
      if (!sseReconnectTimer && !metaLoadFailed) {
        showBanner('warn', '↻ 热更新连接断开，正在自动重连…');
      }
      // 5 秒后如果还没重连成功，提示用户
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

  /* 初始化 */
  setupCollapse();
  loadMeta();
  connectSSE();
})();