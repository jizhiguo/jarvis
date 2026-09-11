# J.A.R.V.I.S. • 智能全息交互中枢与车机轨迹重构系统 (VTR MCP)

> **Just A Rather Very Intelligent System (J.A.R.V.I.S.)**  
> 融合 **Gemini Live API** 实时双工语音、**Google Search 实时接地**、**Nano Banana Pro** 视觉创作与 **VTR MCP Server (车辆轨迹重构 / LTC 利通虾)** 的下一代车载与战术智能中枢。

---

## 🌟 核心特性 (Key Features)

1. **沉浸式 HUD 全屏交互 (Holo-HUD Fullscreen)**
   - 支持一键切换全屏 HUD 视效，支持 `ESC` 快捷键退出。
   - 具备反应堆动态电弧动画（Arc Reactor）、实时声波电平波动（Audio Waveform）及系统遥测诊断信息。

2. **双语音唤醒词支持 (Voice Wake Words: "利通虾" / "Jarvis")**
   - 浏览器原生连续语音识别，支持以下唤醒词即时响应：
     - **利通虾**：针对车规与道路轨迹重构场景的高敏唤醒。
     - **Jarvis**：经典智能管家唤醒词。
   - 唤醒后自动播放 Jarvis 专属确认语音（*“在的，先生。请吩咐” / “Yes, Sir? Standing by.”*），并立即开启麦克风或执行伴随指令。
   - 提供独立唤醒监听开关及免麦克风的一键模拟测试按钮。

3. **双语界面与双主题模式 (Bilingual & Dark/Light Theme)**
   - **中 / 英双语自由切换**：中文（简体）与 English 完整本地化。
   - **深色 (Dark) / 浅色 (Light) 模式**：全组件自适应色彩与光影，支持记忆存储。

4. **便捷的多通道 API Key 与 MCP 配置 (Multi-Channel Configuration)**
   - **Web UI 即时配置**：点击界面右上角齿轮（⚙️）弹出设置面板，可即时修改并测试 **Gemini API Key**、**VTR MCP Server URL**、**MCP X-API-Key** 及唤醒词开关。
   - **本地环境变量**：支持直接通过 `.env` 文件进行配置，适配容器化与自动化部署。

5. **本地/远程 VTR MCP Server 无缝集成**
   - 遵循 Model Context Protocol (MCP) SSE 规范，深度连接车辆轨迹重构服务器（`vtr-mcp-server`）。
   - 支持预设测试（如粤港澳大湾区高速通行轨迹、跨城物流冷链轨迹等），一键运行诊断。

6. **多模态智能矩阵**
   - **Gemini Live 双工语音**：16kHz PCM 输入流与 24kHz 高保真语音流实时低延迟合成。
   - **Google Search Grounding**：实时联网搜索接地，精准回答突发时事与技术问题。
   - **Nano Banana Pro**：高精插画生成与摄像头肖像重构（Reimagine Studio）。

---

## 🛠️ 环境准备 (Prerequisites)

- **Node.js**: `>= 18.0.0` (推荐 Node.js 20 LTS)
- **包管理工具**: `npm` (推荐) 或 `pnpm` / `yarn`
- **浏览器推荐**: Google Chrome / Microsoft Edge（完整支持 Web Speech API 唤醒词与 AudioContext）
- **Gemini API Key**: 从 [Google AI Studio](https://aistudio.google.com/) 获取。
- **本地或内网 VTR MCP Server**: 如默认配置 `http://128.23.8.200:8790/sse`（自带或自建 MCP 服务均可）。

---

## 🚀 本地部署详细步骤 (Local Deployment Guide)

### 1. 克隆代码仓库

```bash
git clone https://github.com/your-username/jarvis-vtr-mcp.git
cd jarvis-vtr-mcp
```

### 2. 安装项目依赖

在项目根目录下执行：

```bash
npm install
```

> **注意**：如果处于国内网络环境，可配置官方或镜像加速源：
> ```bash
> npm config set registry https://registry.npmmirror.com
> npm install
> ```

### 3. 配置环境变量 (API Key 与 MCP X-API-Key)

复制环境变量模板：

```bash
cp .env.example .env
```

使用编辑器打开 `.env` 并填入您的凭证信息：

```env
# Google AI Studio Gemini API Key (必填)
GEMINI_API_KEY="AIzaSyYourGeminiApiKeyHere..."

# 本地运行端口默认 3000
APP_URL="http://localhost:3000"

# 本地或内网部署的 VTR MCP Server SSE 地址 (选填，支持在前端设置面板中动态修改)
VTR_MCP_URL="http://128.23.8.200:8790/sse"

# VTR MCP Server 认证密钥 X-API-Key (选填，支持在前端设置面板中动态修改)
VTR_MCP_API_KEY="vt-your-mcp-key-here"
```

> 💡 **提示**：即使未在 `.env` 中预先配置，您也可以在启动后直接点击 Web 界面右上角的 **⚙️ 设置** 按钮进行可视化配置与保存！

### 4. 启动本地开发服务 (Dev Mode)

```bash
npm run dev
```

终端将输出启动信息，开发服务器将监听在：
👉 **`http://localhost:3000`**

在浏览器中打开该地址即可开始体验。

### 5. 生产环境构建与启动 (Production Build)

如需进行生产环境部署：

```bash
# 编译前端静态资源与后端服务端捆绑包
npm run build

# 启动生产服务
npm start
```

---

## ⚙️ API Key 与 MCP X-API-Key 配置详解

系统支持 **双通道配置**，无需重复重启服务：

| 配置项 | 环境变量名 (`.env`) | 前端 UI 配置位置 | 说明 |
| :--- | :--- | :--- | :--- |
| **Gemini API Key** | `GEMINI_API_KEY` | 设置弹窗 ➔ Gemini API Key | 驱动实时语音、搜索接地及图像生成 |
| **MCP SSE URL** | `VTR_MCP_URL` | 设置弹窗 ➔ MCP Server URL | 默认为 `http://128.23.8.200:8790/sse` |
| **MCP X-API-Key** | `VTR_MCP_API_KEY` | 设置弹窗 ➔ MCP X-API-Key | 认证头 `X-API-Key`，与本地 MCP 校验 |
| **语音唤醒词开关** | 浏览器 `localStorage` | 设置弹窗 ➔ 语音唤醒词开关 | 支持开启/关闭 “利通虾” 与 “Jarvis” |

---

## 🎙️ 语音唤醒词使用指南 (Voice Wake Word)

1. 首次加载页面时，浏览器会请求**麦克风权限**，请点击“允许”。
2. 只要控制台处于就绪状态，对麦克风说出以下任一唤醒词：
   - 🗣️ **“利通虾，帮我重构车辆轨迹”**
   - 🗣️ **“Jarvis, report system status”**
3. 系统将立即弹出唤醒提示，播放管家声效，并自动提交指令进行解析。
4. 若无麦克风，可点击 HUD 左下方的 **⚡ 利通虾** 或 **⚡ Jarvis** 快捷按钮进行仿真测试。

---

## 📦 项目结构说明 (Project Structure)

```text
├── server.ts                  # Node.js + Express 服务端 (集成 Gemini SDK & MCP 代理)
├── server/
│   └── mcpManager.ts          # MCP Server 客户端管理与 SSE 协议通信核心
├── src/
│   ├── App.tsx                # 主应用组件与全局状态管理 (中英/主题/设置)
│   ├── i18n.ts                # 中英文多语言字典与翻译引擎
│   ├── types.ts               # TypeScript 核心数据类型定义
│   ├── components/
│   │   ├── Header.tsx         # 导航栏、语言/主题切换、设置入口
│   │   ├── LiveConsole.tsx    # HUD 控制台、全屏矩阵、声波与消息流
│   │   ├── ArcReactor.tsx     # 反应堆高精度 SVG 动态电弧组件
│   │   ├── VtrModule.tsx      # 车辆轨迹重构 (LTC 利通虾) 专用面板与预设
│   │   ├── SettingsModal.tsx  # API Key 与 MCP 连接可视化配置弹窗
│   │   ├── SearchModule.tsx   # Google Search 接地事实检索
│   │   ├── CreateModule.tsx   # Nano Banana Pro 插画生成
│   │   └── ReimagineModule.tsx# 镜头艺术风格重构
│   └── utils/
│       ├── audio.ts           # 16kHz PCM 麦克风录音与 24kHz 无缝播放器
│       └── useWakeWord.ts     # 语音唤醒词识别 Hook ("利通虾" / "Jarvis")
├── .env.example               # 环境变量配置范例
├── metadata.json              # 项目元数据说明
└── package.json               # 依赖与命令配置
```

---

## 📄 开源许可证 (License)

本项目采用 [MIT License](LICENSE) 开源协议。
