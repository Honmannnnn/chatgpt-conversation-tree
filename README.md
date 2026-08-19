<p align="center">
  <img src="icon.svg" width="100" alt="ChatGPT Conversation Tree Logo" />
</p>

# 🧭 ChatGPT Conversation Tree

[![Version](https://img.shields.io/badge/version-v1.0.6-blue.svg)](https://github.com/honmannnnn/chatgpt-conversation-tree)
[![Manifest](https://img.shields.io/badge/manifest-V3-green.svg)](https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3)
[![Platform](https://img.shields.io/badge/platform-Chrome%20%7C%20Edge-lightgrey.svg)](https://github.com/honmannnnn/chatgpt-conversation-tree)
[![Privacy](https://img.shields.io/badge/privacy-100%25%20local-blueviolet.svg)](https://github.com/honmannnnn/chatgpt-conversation-tree)

一款专注于 ChatGPT 对话分支可视化的浏览器扩展。它会实时追踪你在 ChatGPT 中创建的所有编辑分支与消息版本分支，并把它们还原成可交互的树状全景图。无论你回到主分支编辑历史消息，还是在同一消息上生成多个版本，都能看到完整路线、节点内容与当前活跃路径。

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

- **🧬 双分支统一建模**: 同时识别“编辑历史消息产生的对话分叉”和“单条消息的 1/2、2/2 版本分支”，并在同一棵树中表达。
- **🕸️ 实时对话全景图**: 监听 ChatGPT 页面变化，自动重建节点、父子关系、消息版本和当前活跃路径。
- **📖 节点内容预览**: 点击任意节点即可查看该节点的用户提问、模型回复、思考过程、工具调用与消息来源。
- **🎯 活跃路径高亮**: 当前正在查看的版本、分支和完整上下文路径会在树中清晰标记。
- **🧭 分支定位**: 从树中定位到 ChatGPT 页面上的具体消息，快速回到历史节点或切换版本。
- **🔍 搜索与筛选**: 支持按文本、角色、工具调用、分支状态过滤节点，快速在大对话中导航。
- **💾 本地优先**: 使用 `chrome.storage.local` 保存图结构和消息快照，不上传任何内容。
- **📤 导出快照**: 支持导出 JSON 图数据、Markdown 对话线稿和当前树图 PNG/SVG。
- **🎨 ChatGPT 原生观感**: 跟随 ChatGPT 的浅色/深色模式、字体、间距、圆角与组件语言，不破坏原页面操作。

## 🧠 分支模型

本插件把 ChatGPT 的两类分支抽象为同一个有向无环图（DAG）：

```text
Node = ConversationTurn
  id: stable hash
  role: user | assistant | system | tool
  content: markdown/text snapshot
  parentId: previous conversation turn
  sourceMessageId: ChatGPT DOM message id
  versions: [{ versionId, content, createdAt, sourceVersionId }]

Edge = parentId -> childId
```

- **对话分叉**: 用户回到历史节点重新编辑提问后，新产生的后续消息形成一条新的子路径。
- **消息版本分支**: 同一条 assistant 消息重新生成或编辑后，ChatGPT 页面出现的 `1/2`、`2/2` 属于该节点的多个版本。
- **活跃路径**: 根据页面当前选中的版本、滚动位置和可见消息，实时计算并高亮一条从根节点到当前节点的路径。

## 🖼️ 界面预览

> 界面截图将在首个可运行版本完成后补充。

## 🚀 快速上手

### 从 Release 安装

1. 打开项目的 [Releases 页面](https://github.com/honmannnnn/chatgpt-conversation-tree/releases)。
2. 下载最新版本资源包。
3. 解压到本地目录，确认目录内直接包含 `manifest.json`。
4. 打开 Chrome/Edge 扩展管理页，并开启“开发者模式”。
5. 点击“加载解压的扩展程序”，选择解压后的目录。

详细安装与排错说明见 [INSTALL.md](docs/INSTALL.md)。

### 开发者安装

1. Clone 本项目到本地。
2. 执行 `pnpm install && pnpm build`。
3. 打开扩展管理页并开启“开发者模式”。
4. 点击“加载解压的扩展程序”，选择 `dist` 目录。

### 本地预览树图 Demo

1. 执行 `pnpm demo`。
2. 打开 `http://127.0.0.1:5173/demo.html`。

## 🗺️ 未来规划 (Roadmap)

- [x] **仓库初始化**: 建立项目目录、Manifest V3 骨架与 README。
- [x] **v0.1.0 核心解析器**: 完成 ChatGPT API 响应捕获、消息节点解析、双分支数据模型与本地持久化。
- [x] **v0.2.0 树图面板**: 在页面侧边注入树状图，支持缩放、平移、折叠、节点聚焦和当前路径高亮。
- [x] **v0.3.0 分支导航**: 支持点击节点定位到原消息，兼容 ChatGPT 的编辑分支与消息版本切换控件。
- [x] **v0.4.0 搜索与预览**: 增加全文搜索、消息详情侧栏、角色筛选和活跃版本切换。
- [x] **v0.5.0 导出与快照**: 支持 JSON、Markdown、SVG 导出，以及节点内容复制。
- [x] **v1.0.0 稳定发布**: 适配 ChatGPT 主题与响应式布局，补充 Release 打包与安装排错文档。

## 📦 版本记录

完整版本变化见 [CHANGELOG.md](CHANGELOG.md)。

## 🛠️ 技术内幕

- **Manifest**: Chromium V3
- **核心语言**: TypeScript + Vite
- **UI 运行时**: React + Shadow DOM，隔离扩展样式与 ChatGPT 页面样式
- **树图渲染**: 自研 SVG 树布局与交互层，后续可选接入 React Flow
- **状态管理**: Zustand
- **数据存储**: `chrome.storage.local`（后续大对话场景再迁移 IndexedDB）
- **DOM 解析**: MutationObserver + Adapter 选择器策略，降低 ChatGPT 改版影响

## 🤝 贡献与反馈

欢迎提交 Issue 或 Pull Request 来改进这个项目。
