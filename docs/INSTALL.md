# 安装与使用

## 从 Release 安装

1. 打开 [Releases](https://github.com/Honmannnnn/chatgpt-conversation-tree/releases)。
2. 下载最新版本的 `chatgpt-conversation-tree-v*.zip`。
3. 解压到固定目录，确认解压后目录内直接包含 `manifest.json`。
4. 打开 Chrome 或 Edge 的扩展管理页。
5. 开启“开发者模式”。
6. 点击“加载解压的扩展程序”，选择解压后的目录。

## 从源码构建

```bash
pnpm install
pnpm build
```

构建产物位于 `dist/`。在扩展管理页中选择该目录即可。

## 本地预览树图

```bash
pnpm demo
```

打开 `http://127.0.0.1:5173/demo.html`。

## 使用步骤

1. 打开一个 ChatGPT 对话。
2. 点击页面右下角的绿色树形按钮，或点击浏览器工具栏中的插件图标。
3. 插件会捕获 ChatGPT 的 conversation API，并显示完整分支树。
4. 点击树节点可以定位到原消息；目标版本不在当前页面时会尝试切换分支控件。
5. 使用搜索、角色筛选和“仅活跃路径”快速定位节点。
6. 需要备份时，可导出 JSON、Markdown 或 SVG。

## 常见问题

### 没有出现浮动按钮

- 确认当前域名是 `https://chatgpt.com` 或 `https://chat.openai.com`。
- 在扩展管理页刷新插件，然后刷新 ChatGPT 页面。

### 没有捕获到对话

- 先打开或刷新一个具体对话，不要停留在 ChatGPT 首页。
- 点击插件 Popup 中的“刷新”，或点击树面板中的刷新按钮。

### 点击节点无法定位

- ChatGPT 页面结构可能已经改版。请在项目仓库提交 Issue，并附上页面上的按钮或消息元素截图。
- 如果目标消息不在当前活跃分支中，插件会尝试切换附近的版本按钮；如果页面未加载该控件，则无法定位。

### 数据是否会上传

不会。插件默认只使用浏览器本地存储，不包含任何遥测、账号或服务端同步逻辑。
