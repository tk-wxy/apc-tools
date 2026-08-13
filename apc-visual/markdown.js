/* 轻量 Markdown 渲染器（无外部依赖） */

function escapeHtml(str) {
  return str
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"');
}

/* 高亮 {{...}} 占位符 */
function highlightPlaceholders(html) {
  return html.replace(/\{\{[^}]*\}\}/g, m => `<span class="ph">${m}</span>`);
}

/* 行内样式：代码、粗体、斜体 */
function renderInline(text) {
  let html = escapeHtml(text);
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  return html;
}

/* 生成「源行号 + 变更标注」属性串。
   diffLines[i] 取值：null（未变更）| 'added'（新增）| 'modified'（修改）。
   块级元素跨多行时（代码块），任一行变更则整块标注。 */
function srcAttr(lineNo, diffLines, startLine, endLine) {
  if (!diffLines) return ` data-src-line="${lineNo}"`;
  const s = startLine == null ? lineNo : startLine;
  const e = endLine == null ? lineNo : endLine;
  let hasAdded = false, hasModified = false;
  for (let i = s; i <= e; i++) {
    if (diffLines[i] === 'added') hasAdded = true;
    else if (diffLines[i] === 'modified') hasModified = true;
  }
  let cls = '';
  if (hasModified) cls = 'diff-modified';
  else if (hasAdded) cls = 'diff-added';
  return ` data-src-line="${lineNo}"` + (cls ? ` class="${cls}"` : '');
}

function renderMarkdown(md, options) {
  const diffLines = options && options.diffLines;
  const lines = md.split('\n');
  let html = '';
  let inCode = false;
  let codeBuffer = [];
  let codeStartLine = 0;
  let inUl = false;
  let inOl = false;
  let inTable = false;

  function closeUl() { if (inUl) { html += '</ul>\n'; inUl = false; } }
  function closeOl() { if (inOl) { html += '</ol>\n'; inOl = false; } }
  function closeTable() { if (inTable) { html += '</tbody></table>\n'; inTable = false; } }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 代码块
    if (line.trim().startsWith('```')) {
      closeUl(); closeOl(); closeTable();
      if (!inCode) {
        inCode = true; codeBuffer = []; codeStartLine = i;
      } else {
        inCode = false;
        html += `<pre${srcAttr(codeStartLine, diffLines, codeStartLine, i)}><code>${escapeHtml(codeBuffer.join('\n'))}</code></pre>\n`;
      }
      continue;
    }
    if (inCode) { codeBuffer.push(line); continue; }

    const trimmed = line.trim();

    // 空行
    if (trimmed === '') {
      closeUl(); closeOl(); closeTable();
      continue;
    }

    // 表格（当前处于表格中）
    if (inTable && trimmed.startsWith('|')) {
      const cells = trimmed.split('|').slice(1, -1);
      html += `<tr${srcAttr(i, diffLines)}>` + cells.map(c => `<td>${highlightPlaceholders(renderInline(c))}</td>`).join('') + '</tr>\n';
      continue;
    }

    // 新表格：表头 + 分隔行
    if (trimmed.startsWith('|') && i + 1 < lines.length && /^\|[\s\-:|]+\|?$/.test(lines[i + 1].trim())) {
      closeUl(); closeOl(); closeTable();
      const headerCells = trimmed.split('|').slice(1, -1);
      html += `<table><thead><tr${srcAttr(i, diffLines)}>` +
        headerCells.map(c => `<th>${highlightPlaceholders(renderInline(c))}</th>`).join('') +
        '</tr></thead><tbody>\n';
      inTable = true;
      i++; // 跳过分隔行
      continue;
    }

    // 标题
    const h = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      closeUl(); closeOl(); closeTable();
      const level = h[1].length;
      html += `<h${level}${srcAttr(i, diffLines)}>${highlightPlaceholders(renderInline(h[2]))}</h${level}>\n`;
      continue;
    }

    // 引用
    if (trimmed.startsWith('>')) {
      closeUl(); closeOl(); closeTable();
      const quoteText = trimmed.replace(/^>\s?/, '');
      html += `<blockquote${srcAttr(i, diffLines)}>${highlightPlaceholders(renderInline(quoteText))}</blockquote>\n`;
      continue;
    }

    // 无序列表
    if (/^[-*+]\s+/.test(trimmed)) {
      closeOl(); closeTable();
      if (!inUl) { html += '<ul>\n'; inUl = true; }
      const itemText = trimmed.replace(/^[-*+]\s+/, '');
      const subMatch = trimmed.match(/^(\s*)[-*+]\s+(.*)$/);
      const indent = subMatch ? subMatch[1].length : 0;
      const content = indent > 0 ? subMatch[2] : itemText;
      html += `<li${srcAttr(i, diffLines)}>${highlightPlaceholders(renderInline(content))}</li>\n`;
      continue;
    }

    // 有序列表
    if (/^\d+\.\s+/.test(trimmed)) {
      closeUl(); closeTable();
      if (!inOl) { html += '<ol>\n'; inOl = true; }
      const content = trimmed.replace(/^\d+\.\s+/, '');
      html += `<li${srcAttr(i, diffLines)}>${highlightPlaceholders(renderInline(content))}</li>\n`;
      continue;
    }

    // 水平线
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      closeUl(); closeOl(); closeTable();
      html += `<hr${srcAttr(i, diffLines)}>\n`;
      continue;
    }

    // 普通段落
    closeUl(); closeOl(); closeTable();
    html += `<p${srcAttr(i, diffLines)}>${highlightPlaceholders(renderInline(trimmed))}</p>\n`;
  }

  closeUl(); closeOl(); closeTable();
  if (inCode) { html += `<pre${srcAttr(codeStartLine, diffLines, codeStartLine, lines.length - 1)}><code>${escapeHtml(codeBuffer.join('\n'))}</code></pre>\n`; }

  return html;
}