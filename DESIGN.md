# Design Document — AI Vision Chat

> 版本：v1.0  
> 日期：2026-06-14  

---

## 1. 用户故事对照表

| ID | 故事 | 优先级 | 计划 | 实现 | 备注 |
|----|------|--------|------|------|------|
| US-01 | 一键授权摄像头和麦克风 | P0 | 1d | ✅ | PermissionGate 组件，授权后自动进入对话 |
| US-02 | AI 实时看到摄像头画面并回应 | P0 | 3d | ✅ | useCamera + frameCapture + 多模态 API |
| US-03 | 用语音与 AI 对话 | P0 | 2d | ✅ | Web Speech API STT，按住说话松开发送 |
| US-04 | AI 用语音回答 | P0 | 2d | ✅ | Web Speech API TTS，自动播放 |
| US-05 | 对话上下文保持连贯 | P0 | 2d | ✅ | useSession 管理消息历史，自动裁剪 |
| US-06 | 控制 API 费用 | P1 | 3d | ✅ | 三档成本模式，帧去重，运动检测 |
| US-07 | 调节语音速度、音量、语言 | P2 | 1d | ✅ | SettingsPanel 中可调（部分） |
| US-08 | 对话文字历史记录 | P1 | 1d | ✅ | ChatMessageList 可滚动查看 |
| US-09 | 随时静音或关闭摄像头 | P1 | 0.5d | ✅ | StatusBar 开关按钮 |
| US-10 | 弱网环境下继续对话 | P2 | 2d | ✅ | networkDetect + OfflineNotice + 自动降级 |

---

## 2. 成本策略对照表

| # | 策略名称 | 描述 | 想到 | 采用 | 说明 |
|---|---------|------|------|------|------|
| C1 | 动态帧率控制 | 对话活跃时高频传帧，静默时降帧 | ✅ | ✅ | costConfig 三档配置不同帧间隔 |
| C2 | 运动检测剪枝 | 画面无变化时不传帧 | ✅ | ✅ | motionDetect.ts 像素差异检测 |
| C3 | 图像压缩 | JPEG quality 可调 | ✅ | ✅ | frameCapture 支持 quality 参数 |
| C4 | 语义降频 | 仅传差异帧，不重复 | ✅ | ✅ | frameDedup.ts hash 比对 |
| C5 | GPT-4o-mini 降级 | 简单对话使用轻量模型 | ✅ | ✅ | useMiniModel 标志（实际用 doubao-lite） |
| C6 | 对话历史剪枝 | 超出限制时丢弃早期消息 | ✅ | ✅ | maxHistoryRounds 控制 |
| C7 | 图片缓存去重 | 相似帧不重复上传 | ✅ | ✅ | 与 C4 合并实现 |
| C8 | 夜间/低活跃模式 | 长时间无交互暂停采集 | ✅ | ✅ | autoSleep 自动休眠 |
| C9 | 本地 VAD 过滤 | 仅检测到有效语音才发起请求 | ✅ | ✅ | vadDetect.ts 能量阈值检测 |
| C10 | TTS 缓存 | 相同文本不重复调用 TTS | ✅ | ❌ | 回复重复率低，收益有限 |
| C11 | 流式 TTS 中断 | 用户打断时停止播放 | ✅ | ✅ | speechInterrupt + cancelTTS |
| C12 | 请求批处理 | 多条累积后一次发送 | ✅ | ❌ | 与实时性冲突 |
| C13 | 端侧模型兜底 | 离线时本地模型简单回复 | ✅ | ❌ | MVP 范围外 |
| C14 | 设置化成本模式 | 提供 off/balanced/aggressive 用户可选 | ✅ | ✅ | SettingsPanel + costConfig |
| C15 | Token 用量仪表盘 | 实时显示 Token 消耗 | ✅ | ❌ | 已移除（用户要求删除 usage） |
| C16 | 沉默自动休眠 | 连续 N 分钟无对话释放资源 | ✅ | ✅ | autoSleep 实现 |
| C17 | 端侧帧降噪去重 | 发送前感知哈希去重 | ✅ | ✅ | frameDedup 实现 |

---

## 3. 架构变更记录

### 3.1 模型选型

| 阶段 | 模型 | 原因 |
|------|------|------|
| 初始设计 | GPT-4o | 原生支持多模态，理解力强 |
| 实际采用 | 豆包 doubao-seed-2-0-lite | 火山引擎国内可用，成本低 |
| 调整 | doubao-seed-2-0-lite → 可配置 | 通过 VITE_MODEL 环境变量切换 |

### 3.2 语音方案

| 模块 | 原设计 | 实际实现 | 原因 |
|------|--------|---------|------|
| STT | OpenAI Whisper API | 浏览器 Web Speech API | 免费、零依赖、即时可用 |
| TTS | OpenAI TTS API | 浏览器 SpeechSynthesis | 同上，离线可用 |
| VAD | Silero VAD (ONNX) | 能量阈值检测 | 避免 onnxruntime-web 体积和加载延迟 |

### 3.3 API 通信

| 项目 | 设计 |
|------|------|
| 协议 | HTTP POST, Server-Sent Events (SSE) |
| 流式解析 | AsyncGenerator + ReadableStream |
| 超时 | 30s AbortSignal.timeout |
| 错误处理 | 流内 error 事件检测 + 友好中文提示 |

---

## 4. 关键设计决策

### 4.1 消息结构

**最初：** 图片和文本在同一 user 消息，图片在前。

**问题：** 视觉模型优先描述图片，忽略用户问题。

**尝试：** 两消息结构——文本问题单独一条 user 消息，图片另起一条。

**结果：** 模型混淆，返回规则确认而非回答问题。

**最终方案：** 恢复单消息结构，文本在前图片在后，系统 prompt 一句话指令。

### 4.2 图片发送策略

**用户要求：** 不论什么问题都必须发送图片。

**方案：** 始终发送图片，通过 prompt 控制模型行为。代码层面不做图片拦截。

### 4.3 STT 冷启动

**问题：** Web Speech API 首次调用需初始化，第一次语音输入无响应。

**修复：** `preloadSTT()` 在页面加载时预热 SpeechRecognition 实例。

### 4.4 TTS 无声

**问题：** SpeechSynthesis.getVoices() 异步返回，首次说话无声。

**修复：** voiceschanged 事件监听 + warmup utterance。

### 4.5 超时与空响应

**问题：** API 超时或返回空内容时用户无反馈。

**修复：** fetch 30s 超时 + 流内 abort 处理 + 空响应自动重试 + 用户提示。

---

## 5. 项目结构

```
src/
  components/
    CameraPreview.tsx     — 摄像头预览
    ChatMessageList.tsx   — 对话消息列表
    ErrorBoundary.tsx     — 全局错误捕获
    OfflineNotice.tsx     — 离线提示
    PermissionGate.tsx    — 权限引导页
    SettingsPanel.tsx     — 设置面板
    StatusBar.tsx         — 底部状态栏
  hooks/
    useCamera.ts          — 摄像头管理
    useMicrophone.ts      — 麦克风管理
    useMultimodalChat.ts  — 多模态对话引擎
    useSession.ts         — 会话管理
  lib/
    apiProxy.ts           — API 代理（流式请求、消息构建）
    audioCapture.ts       — 音频录制
    audioPlayer.ts        — 音频播放（暂未使用）
    autoSleep.ts          — 自动休眠
    costConfig.ts         — 成本模式配置
    frameCapture.ts       — 帧捕获与 JPEG 编码
    frameDedup.ts         — 帧去重
    motionDetect.ts       — 运动检测
    networkDetect.ts      — 网络状态检测
    promptTemplates.ts    — 系统提示模板
    speechInterrupt.ts    — 语音打断
    sttService.ts         — 语音识别
    ttsService.ts         — 语音合成
    vadDetect.ts          — 语音活动检测
  types/
    index.ts              — 类型定义
  App.tsx                 — 主应用组件
  main.tsx               — 入口文件
  index.css              — 全局样式
```

---

## 6. 第三方依赖

| 依赖 | 版本 | 用途 | 是否必需 |
|------|------|------|---------|
| react | ^18.3.1 | UI 框架 | 是 |
| react-dom | ^18.3.1 | DOM 渲染 | 是 |
| tailwindcss | ^3.4.17 | CSS 样式 | 是 |
| vite | ^6.0.0 | 构建工具 | 是 |
| typescript | ~5.6.2 | 类型检查 | 是 |
| @vitejs/plugin-react | ^4.3.4 | Vite React 插件 | 是 |
| postcss | ^8.4.49 | CSS 后处理 | 是 |
| autoprefixer | ^10.4.20 | CSS 前缀 | 是 |

所有 AI 和媒体功能均使用浏览器原生 API（WebRTC、Web Speech API、Canvas、Fetch + SSE），无外部 AI SDK。

---

## 7. 部署

- **平台：** GitHub Pages
- **工作流：** .github/workflows/deploy.yml
- **构建：** `tsc -b && vite build`
- **环境变量：** 通过 GitHub Secrets 注入（VITE_API_KEY, VITE_MODEL 等）
- **访问地址：** https://zxy24171.github.io/ai/
- **Demo 视频：** 百度网盘 (提取码: hgqj)
