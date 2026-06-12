# 实现计划

> 基于 SPEC.md，将每项工作拆解为可执行的任务，标出依赖关系和交付物。

---

## 阶段总览

| 阶段 | 名称 | 产出 | 依赖 |
|------|------|------|------|
| P1 | 项目脚手架 & 设备层 | 能跑起来的 React 项目，摄像头/麦克风可预览 | 无 |
| P2 | 对话引擎 | GPT-4o 多模态调用 + 消息管理 | P1 |
| P3 | 语音交互 | VAD + STT + TTS 完整闭环 | P2 |
| P4 | 成本控制 | 动态帧率、降级路由、Token 预算、仪表盘 | P3 |
| P5 | 体验打磨 | 设置面板、弱网降级、UI 完善 | P4 |
| P6 | 设计文档 | 最终设计文档（用户故事对比 & 成本策略对比） | P5 |

---

## P1 — 项目脚手架 & 设备层

**关联用户故事**：US-01  
**目标**：跑起一个 React + TypeScript + Vite 项目，摄像头和麦克风能预览，用户可一键授权。

| 步骤 | 任务 | 交付物 |
|------|------|--------|
| 1.1 | 用 Vite 创建 React + TypeScript 项目 | package.json, ite.config.ts, 	sconfig.json |
| 1.2 | 安装依赖：Tailwind CSS, OpenAI SDK | 依赖配置 |
| 1.3 | 实现 useCamera hook：getUserMedia、预览、切换分辨率 | src/hooks/useCamera.ts |
| 1.4 | 实现 useMicrophone hook：getUserMedia、音频流、Mute | src/hooks/useMicrophone.ts |
| 1.5 | 实现 CameraPreview 组件：显示摄像头画面 | src/components/CameraPreview.tsx |
| 1.6 | 实现 PermissionGate 组件：引导用户一键授权 | src/components/PermissionGate.tsx |
| 1.7 | 实现主页面布局：左侧摄像头预览 + 右侧对话区 | src/App.tsx |
| 1.8 | 实现 US-09：麦克风/摄像头的开关按钮 | 控件集成到页面 |

**验收标准**：
- [ ] 项目 
pm run dev 能启动
- [ ] 用户首次打开看到授权引导界面
- [ ] 点击授权后摄像头画面实时显示在左侧
- [ ] 麦克风状态有指示器
- [ ] 可随时关闭/开启摄像头和麦克风

---

## P2 — 对话引擎

**关联用户故事**：US-02, US-05, US-08  
**目标**：AI 能看到摄像头画面并做出多模态回复，对话历史可滚动回溯。

| 步骤 | 任务 | 交付物 |
|------|------|--------|
| 2.1 | 实现 FrameCapture 模块：从视频流中定时取帧、JPEG 压缩 | src/lib/frameCapture.ts |
| 2.2 | 实现运动检测：逐帧像素差异比较，决定是否上传 | src/lib/motionDetect.ts |
| 2.3 | 实现 useSession hook：消息列表管理、历史存储 | src/hooks/useSession.ts |
| 2.4 | 实现 useMultimodalChat hook：组装 Prompt、调用 GPT-4o vision | src/hooks/useMultimodalChat.ts |
| 2.5 | 实现 ChatMessageList 组件：渲染对话历史 | src/components/ChatMessageList.tsx |
| 2.6 | 实现系统指令模板 | src/lib/promptTemplates.ts |
| 2.7 | 实现 API 代理层：请求组装、环境变量管理 | src/lib/apiProxy.ts |
| 2.8 | 集成对话流：用户说 → 取帧 → 调 GPT-4o → 显示文字回复 | 页面端到端可用 |

**验收标准**：
- [ ] 用户说话（先打字模拟）后，最新 1-2 帧被编码发送
- [ ] GPT-4o 能基于画面内容给出合理回应
- [ ] 对话历史在右侧列表中滚动查看
- [ ] 上下文保持连续（记得前几轮的内容）
- [ ] 帧变化时才上传（运动检测生效）

---

## P3 — 语音交互

**关联用户故事**：US-03, US-04  
**目标**：用户用语音说话，AI 用语音回答，形成完整的语音对话闭环。

| 步骤 | 任务 | 交付物 |
|------|------|--------|
| 3.1 | 实现音频录制：从麦克风流中采集 PCM 数据 | src/lib/audioCapture.ts |
| 3.2 | 实现 VAD 端点检测（基于能量阈值）：检测语音开始/结束 | src/lib/vadDetect.ts |
| 3.3 | 实现 STT（语音转文字）：音频 Blob → Whisper API | src/lib/sttService.ts |
| 3.4 | 实现 TTS（文字转语音）：回复文本 → OpenAI TTS API | src/lib/ttsService.ts |
| 3.5 | 实现音频播放模块：管理 TTS 音频队列、流式播放 | src/lib/audioPlayer.ts |
| 3.6 | 实现语音打断：用户新语音开始时停止当前 TTS | src/lib/speechInterrupt.ts |
| 3.7 | 集成语音到对话流：麦克风 → VAD → STT → GPT-4o → TTS → 喇叭 | 全链路语音闭环 |

**验收标准**：
- [ ] 对着麦克风说话，应用检测到语音开始/结束
- [ ] 语音被转成文字后送入多模态对话
- [ ] AI 回复通过扬声器播放
- [ ] 用户中途打断时，AI 停止说话
- [ ] 全链路延迟 < 3-5 秒（合理网络下）

---

## P4 — 成本控制

**关联用户故事**：US-06  
**目标**：实现 balanced / aggressive 成本模式，用户可见 Token 消耗。

| 步骤 | 任务 | 交付物 |
|------|------|--------|
| 4.1 | 实现三级成本模式配置（off / balanced / aggressive） | src/lib/costConfig.ts |
| 4.2 | 实现动态帧率：按对话活跃度调整采集频率 | 扩展 rameCapture.ts |
| 4.3 | 实现帧去重缓存：感知哈希比对，无变化时不传帧 | src/lib/frameDedup.ts |
| 4.4 | 实现模型降级路由：简单对话 → GPT-4o-mini | 扩展 piProxy.ts |
| 4.5 | 实现对话历史剪枝：超 Token 预算时丢弃旧轮次 | 扩展 useSession.ts |
| 4.6 | 实现沉默自动休眠：N 分钟无对话释放设备 | src/lib/autoSleep.ts |
| 4.7 | 实现 Token 用量仪表盘（实时显示） | src/components/CostDashboard.tsx |
| 4.8 | 实现成本模式切换器（用户可点选模式） | 设置面板集成 |

**验收标准**：
- [ ] balanced 模式下帧率明显降低，画面无变化时不传帧
- [ ] 简单对话（问候）路由到 GPT-4o-mini
- [ ] 历史超出预算时自动裁剪
- [ ] 用户能看到实时 Token 消耗和估算费用
- [ ] 30 分钟无对话后自动释放摄像头/麦克风
- [ ] 三种模式切换后行为正确

---

## P5 — 体验打磨

**关联用户故事**：US-07, US-10  
**目标**：设置面板、弱网降级、错误处理。

| 步骤 | 任务 | 交付物 |
|------|------|--------|
| 5.1 | 实现设置面板 UI（折叠式） | src/components/SettingsPanel.tsx |
| 5.2 | 设置项接入：分辨率、帧率、语速、语言、模型 | 全局状态联动 |
| 5.3 | 实现弱网检测（navigator.connection API） | src/lib/networkDetect.ts |
| 5.4 | 实现弱网降级逻辑：自动降低分辨率、帧率 | 集成到引擎层 |
| 5.5 | 实现离线提示 UI | src/components/OfflineNotice.tsx |
| 5.6 | 错误边界 + 设备异常恢复 | src/components/ErrorBoundary.tsx |
| 5.7 | UI 细节打磨：加载动画、脉冲指示器、过渡效果 | 全局 |

**验收标准**：
- [ ] 设置面板可打开/折叠
- [ ] 修改设置后即时生效
- [ ] 弱网时自动降级、恢复网络后回升
- [ ] 设备异常时有友好的错误提示和重试按钮

---

## P6 — 设计文档

**关联交付物**：最终设计文档  
**目标**：一份完整的文档，对比"计划 vs 实现"的用户故事、"想到 vs 采用"的成本策略。

| 步骤 | 任务 | 交付物 |
|------|------|--------|
| 6.1 | 整理用户故事对比表：计划了哪些，最终实现了哪些，未实现的原因 | DESIGN.md |
| 6.2 | 整理成本策略对比表：想到了哪些，采用了哪些，未采用的原因 | 同上 |
| 6.3 | 补充实现过程中的关键决策记录 | 同上 |

---

## 文件目录结构（规划）

`
7n/
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── CameraPreview.tsx
│   │   ├── ChatMessageList.tsx
│   │   ├── CostDashboard.tsx
│   │   ├── ErrorBoundary.tsx
│   │   ├── OfflineNotice.tsx
│   │   ├── PermissionGate.tsx
│   │   ├── SettingsPanel.tsx
│   │   └── StatusBar.tsx
│   ├── hooks/
│   │   ├── useCamera.ts
│   │   ├── useMicrophone.ts
│   │   ├── useMultimodalChat.ts
│   │   └── useSession.ts
│   ├── lib/
│   │   ├── apiProxy.ts
│   │   ├── audioCapture.ts
│   │   ├── audioPlayer.ts
│   │   ├── autoSleep.ts
│   │   ├── costConfig.ts
│   │   ├── frameCapture.ts
│   │   ├── frameDedup.ts
│   │   ├── motionDetect.ts
│   │   ├── networkDetect.ts
│   │   ├── promptTemplates.ts
│   │   ├── speechInterrupt.ts
│   │   ├── sttService.ts
│   │   ├── ttsService.ts
│   │   └── vadDetect.ts
│   ├── types/
│   │   └── index.ts          # Message, Session, Settings 等接口
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── .env.example              # OPENAI_API_KEY 占位
├── index.html
├── package.json
├── SPEC.md
├── PLAN.md                   # 本文
├── tsconfig.json
└── vite.config.ts
`

---

## 依赖关系图

`
P1 ──▶ P2 ──▶ P3 ──▶ P4 ──▶ P5 ──▶ P6
  │       │               │
  └───────┴───────────────┘
   (P2/P3 可部分并行:
    P2.1-2.3 依赖 P1,
    P3.1-3.2 也依赖 P1)
`

- P2 的核心（取帧 + GPT-4o）不依赖 P3
- P3 的语音流程依赖 P2 的对话引擎
- P4 的成本控制依赖 P2 和 P3 的完整数据通路
- P5 的体验打磨依赖前面的全部
- P6 的文档在最后写

---

## 总工作量估算

| 阶段 | 文件数 | 预估工时 |
|------|--------|---------|
| P1 脚手架 + 设备层 | ~8 文件 | 中等 |
| P2 对话引擎 | ~8 文件 | 较大 |
| P3 语音交互 | ~7 文件 | 较大 |
| P4 成本控制 | ~8 文件 | 中等 |
| P5 体验打磨 | ~6 文件 | 中等 |
| P6 设计文档 | 1 文件 | 小 |

**总计**：约 30+ 源文件，核心代码行估算 ~2000-3000 行 TypeScript。

---

> **下一步**：如果你确认这个计划没问题，我从 **P1** 开始逐阶段落地。
> 如果某个阶段的粒度太粗或顺序需要调整，直接说。
