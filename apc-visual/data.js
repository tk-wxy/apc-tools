/* APC 知识库文件元数据与结构图数据 */

const TRUST = {
  high: { label: '高信任', cls: 'trust-high' },
  low: { label: '低信任', cls: 'trust-low' },
  forensics: { label: '取证用', cls: 'trust-forensics' }
};

const FILES = [
  {
    id: 'manifest',
    name: 'manifest.md',
    path: 'apc/.apc/manifest.md',
    role: '项目宪法：使命、技术栈、不变量、高风险区',
    trust: 'high',
    trustNote: '初始化并经人工确认后高信任；项目锚点'
  },
  {
    id: 'workflow',
    name: 'workflow.md',
    path: 'apc/.apc/workflow.md',
    role: '开发协议：启动、执行、收尾流程（唯一事实来源）',
    trust: 'high',
    trustNote: '规范性文件'
  },
  {
    id: 'rules',
    name: 'rules.md',
    path: 'apc/.apc/rules.md',
    role: '有适用范围的坑、死路、症状索引',
    trust: 'high',
    trustNote: '当证据、适用范围、环境与状态匹配时高信任'
  },
  {
    id: 'decisions',
    name: 'decisions.md',
    path: 'apc/.apc/decisions.md',
    role: '已采用的选择、根因、被拒方案',
    trust: 'high',
    trustNote: '在记录的适用范围内高信任'
  },
  {
    id: 'memory',
    name: 'memory.md',
    path: 'apc/.apc/memory.md',
    role: '当前状态快照 + 最近 ≤3 次会话',
    trust: 'low',
    trustNote: '低信任；用作线索，使用前需核对源码'
  },
  {
    id: 'history',
    name: 'history.md',
    path: 'apc/.apc/history.md',
    role: '归档：超出滚动窗口的旧会话',
    trust: 'forensics',
    trustNote: '默认不读取；仅在需要取证时 grep'
  },
  {
    id: 'garden',
    name: 'garden.md',
    path: 'apc/.apc/garden.md',
    role: '知识库定期维护：人类触发的园艺提示词',
    trust: 'forensics',
    trustNote: '用户触发才读取；正常启动不读取'
  },
  {
    id: 'init',
    name: 'init.md',
    path: 'apc/.apc/init.md',
    role: '初始化协议：一次性运行，覆盖正常启动',
    trust: 'high',
    trustNote: '初始化完成后会移除'
  }
];

const GRAPH = [
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