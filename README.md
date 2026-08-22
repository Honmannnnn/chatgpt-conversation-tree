<p align="center">
  <img src="icon.svg" width="100" alt="ChatGPT Conversation Tree Logo" />
</p>

# 🧭 ChatGPT Conversation Tree

[![Version](https://img.shields.io/badge/version-v1.1.0-blue.svg)](https://github.com/honmannnnn/chatgpt-conversation-tree)
[![Manifest](https://img.shields.io/badge/manifest-V3-green.svg)](https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3)
[![Platform](https://img.shields.io/badge/platform-Chrome%20%7C%20Edge-lightgrey.svg)](https://github.com/honmannnnn/chatgpt-conversation-tree)
[![Privacy](https://img.shields.io/badge/privacy-100%25%20local-blueviolet.svg)](https://github.com/honmannnnn/chatgpt-conversation-tree)

一款专注于 **ChatGPT 对话分支可视化与快速导航** 的现代化浏览器扩展。它采用类似 **Git Graph / Linear** 的极简分支流设计，实时追踪你在 ChatGPT 中编辑历史消息、版本重试、独立分叉（Fork）与 A/B 双模型对比产生的全部对话分叉，将原本孤立复杂的对话链路还原为一目了然的 Git 分支图谱。

---

## ⚠️ 免责声明 (Legal Disclaimer)

**在下载、安装或使用本软件前，请务必仔细阅读以下条款：**

1. **用途限制**：本插件仅供**技术研究、个人知识管理与本地备份**使用。请勿将其用于绕过平台功能、自动化滥用、侵犯版权或其他违反法律法规的行为。
2. **合规性**：用户必须遵守所在地区法律法规及 OpenAI/ChatGPT 的服务条款。因使用本插件导致的账号限制、数据丢失、合规风险或法律责任，均由**使用者自行承担**。
3. **不提供担保**：开发者不对本软件的稳定性、准确性、安全性或兼容性提供任何形式的担保。ChatGPT 页面结构变化可能导致部分功能暂时失效。
4. **数据本地化**：默认情况下，对话内容仅保存在本地浏览器存储中。用户主动导出文件后，应自行管理文件安全。

**English Summary**: This extension is for personal research, knowledge management, and local backup ONLY. It does not collect or upload conversation data. By using this tool, you assume all risks and liabilities.

---

## ✨ 核心特性

- **🌱 极简 Git 分支流系统**: 告别冗长复杂的缩放画布，采用对标 Linear / Raycast 的极简分支流设计。左侧垂直对齐主干线与彩色贝塞尔分支轨道，右侧清晰呈现消息卡片，结构清爽紧凑。
- **🔀 独立分叉智能识别 (Forked Sub-Chat Support)**: 智能识别 ChatGPT 官方的“从此处分叉”独立子会话，精准对齐 `从...建立的分支` 分界线，将分叉前的继承主线与分叉后的独立分支以专属彩色轨道优雅分流。
- **⚡ 实时流式监听 (SSE Stream Interception)**: 深度拦截 ChatGPT 后台 SSE 流式数据传输与 DOM 生成完成事件，在你发送后续追问或模型生成完成的瞬间，右侧分支树**毫秒级自动实时同步**，无需手动刷新。
- **⚖️ A/B 双回复对比高亮 (Model Evaluation Branching)**: 自动识别并标注 ChatGPT 双回复评测（`对比 1/2`、`对比 2/2`），并在平行分支轨道中直观呈现。
- **✨ Linear 级流光呼吸骨架屏 (Skeleton Loading)**: 会话切换与数据加载期间提供翡翠绿呼吸灯轨道 + 流光卡片加载动效，杜绝页面闪烁与残缺排版。
- **🎯 零打扰丝滑交互体验**: 彻底消除点击卡片时的打扰弹窗，并在 SVG 节点周围建立 24px 实体透明热区（Hitbox），消除光标晃动与抽搐。
- **🔍 毫秒级预索引搜索与筛选**: 内置倒排搜索索引，支持关键词实时检索、角色过滤（提问 / 回复 / 工具）以及“仅活跃主线”快速过滤。
- **📤 现代化 Popover 多格式导出**: 支持导出纯净 JSON 结构图、结构化 Markdown 对话线稿以及高清无损 SVG 分支图。
- **💾 100% 本地安全**: 纯本地存储解析，不上传任何隐私数据，严格保障对话安全。

---

## 🧠 Git 分支模型解析

插件将 ChatGPT 的各类分支机制统一抽象为直观的 Git DAG 图谱：

```text
               ┌── [分支 #1: 提问 · 你好1] ──── [回复 · 你好1!]
[主线: 提问 · 你好] ── [回复 · 你好!] ──┤
                               └── [主线: 提问 · 你好111 (2/2)] ── [回复 · 你好111!]
```

- **🟢 主干道 (Lane 0 / Mainline)**: 严格锁定在翡翠绿最左侧垂直轨道，展示当前会话的主线路径；
- **🟠 独立分支与版本重试 (Lane 1+ / Branches)**: 用户编辑提问或重新生成回复产生的不同版本，以琥珀色、蓝色、紫色等贝塞尔曲线自然分叉；
- **🔀 独立分叉子会话**: 自动标记 `主线继承` 与 `独立分叉` 节点，并在面板顶部提供快捷返回主线对话的入口。

---

## 🚀 快速上手

### 从 Release 安装（推荐）

1. 打开项目的 [Releases 页面](https://github.com/honmannnnn/chatgpt-conversation-tree/releases)。
2. 下载最新版本资源包 `chatgpt-conversation-tree-v1.1.0.zip`。
3. 解压到本地目录，确认目录内直接包含 `manifest.json`。
4. 打开 Chrome 或 Edge 浏览器，访问 `chrome://extensions/`，并在右上角开启 **“开发者模式”**。
5. 点击 **“加载已解压的扩展程序”**，选择刚刚解压的目录。
6. 打开或刷新 [ChatGPT 网页](https://chatgpt.com)，右下角即可看到悬浮分支入口或右侧分支面板！

详细安装与排错说明见 [INSTALL.md](docs/INSTALL.md)。

---

### 开发者本地构建

```bash
# 1. 克隆代码仓库
git clone https://github.com/honmannnnn/chatgpt-conversation-tree.git
cd chatgpt-conversation-tree

# 2. 安装依赖
pnpm install

# 3. 执行测试与类型检查
pnpm check

# 4. 构建生产扩展产物
pnpm build

# 5. 打包 Release Zip
pnpm release
```

---

## 🗺️ 功能演进与路线图 (Roadmap)

### ✅ 已发布里程碑 (Completed Milestones)

- [x] **v0.1.0 核心解析器**: 完成 ChatGPT API 响应捕获、消息节点解析、双分支数据模型与本地持久化。
- [x] **v0.2.0 树图面板**: 在页面侧边注入树状图，支持节点聚焦和当前路径高亮。
- [x] **v0.3.0 分支导航**: 支持点击节点定位到原消息，兼容 ChatGPT 的编辑分支与消息版本切换控件。
- [x] **v0.4.0 搜索与预览**: 增加全文搜索、消息详情侧栏、角色筛选和活跃版本切换。
- [x] **v0.5.0 导出与快照**: 支持 JSON、Markdown、SVG 导出，以及节点内容复制。
- [x] **v1.0.0 稳定发布**: 适配 ChatGPT 主题与响应式布局，补充 Release 打包与安装排错文档。
- [x] **v1.1.0 现代化 Git 分支流重构**:
  - [x] **纯粹 Git Branch 视觉体系**: 全面升级为 Linear / Raycast 级极简设计系统，紧凑 16px 轨道与自适应宽度卡片；
  - [x] **流式拦截与实时热更**: SSE 流式请求监听，对话生成完成瞬间自动同步新节点；
  - [x] **独立分叉子会话（Fork）支持**: 精准识别 `从...建立的分支` 分界线，将继承祖先消息与分叉新消息自然分流；
  - [x] **A/B 双回复对比支持**: 自动识别并标注 ChatGPT 双回复评测分支；
  - [x] **流光呼吸骨架屏**: 会话切换 0 闪烁，平滑骨架过渡；
  - [x] **交互防抖与 Hitbox 优化**: 24px 实体透明热区消除光标跳动，移除侵入式弹窗。

### 🚀 未来规划与规划中功能 (Upcoming Roadmap)

- [ ] **v1.2.0 分支对比与 Diff 视图 (Branch Diffing)**:
  - 类似 `git diff`，支持任意选定两个历史版本或不同分支回答的文本差异对比（新增/删除高亮），一目了然看清多次修改与重新生成的细微差别。
- [ ] **v1.3.0 跨会话血缘全景树 (Global Lineage Explorer)**:
  - 提供可选的“血缘全景模式”，一键纵览从同一个原始对话派生出的所有独立子分支会话群，支持跨会话跳转与多层级拓扑穿梭。
- [ ] **v1.4.0 自定义分支书签与打标 (Custom Bookmarks & Tags)**:
  - 允许用户为重要节点添加自定义 Tag（如 `⭐ 最佳回复`、`💡 代码方案`、`📌 待验证`），在庞大分支树中秒级筛选关键节点。
- [ ] **v1.5.0 本地大容量存储引擎升级 (IndexedDB Storage Engine)**:
  - 从 `chrome.storage.local` 迁移至 `IndexedDB` 存储底座，突破浏览器存储配额限制，支持保存 10,000+ 超长历史对话快照。
- [ ] **v1.6.0 多分支一键总结与合并导出 (Multi-Branch Synthesizer)**:
  - 支持勾选多条分支的不同回复，自动生成聚合对比提示词或一键合并导出为结构化知识笔记。

### ⚠️ 已知挑战与探索方向 (Known Challenges & Active Exploration)

- 🔍 **ChatGPT 官方前端改版自适应**: OpenAI 前端频繁热更新，分叉分界线文案（`从...建立的分支` / `独立的分支` / 英文版 `Forked from...`）与 DOM 选择器可能偶发变动，需持续维护动态自适应层。
- ⚡ **超长会话（3000+ 节点）虚拟滚动优化**: 针对包含数千条消息的极端巨型对话，探索引入虚拟窗口列表（Virtual List），进一步降低 DOM 内存与渲染开销。
- 🌐 **多浏览器生态扩展**: 探索向 Firefox Add-ons 与 Safari Web Extension 的移植与兼容。

---

## 🛠️ 技术栈与架构

- **规范体系**: Chromium Manifest V3
- **核心语言**: TypeScript + Vite
- **UI 运行时**: React 18 + Shadow DOM（样式完全隔离，不污染 ChatGPT 原生界面）
- **状态管理**: Zustand
- **分支布局算法**: 自研紧凑型 Git Graph 多轨道排版引擎 (`gitGraphLayout.ts`)
- **数据持久化**: `chrome.storage.local`（按会话隔离存储，防交叉污染）
- **代码规范**: ESLint + Prettier + Conventional Commits

---

## 📦 版本记录

完整版本发布日志请参阅 [CHANGELOG.md](CHANGELOG.md)。

---

## 🤝 贡献与反馈

如果你在日常使用中发现了任何 Bug 或有新的功能构想，欢迎随时提交 [Issue](https://github.com/honmannnnn/chatgpt-conversation-tree/issues) 或 Pull Request！
