# AI进化游戏 - 从比特到上帝

## 项目简介

一个5分钟体验的赛博朋克风格AI进化合成游戏，玩家从数字比特开始，通过合成机制逐步进化到数字上帝，最终揭示关于人工智能与人类关系的哲学思考。

## 快速开始

### 方法1: Python服务器 (推荐)
```bash
cd ai-evolution-game
npm run dev
# 或者
python3 -m http.server 8080
```

### 方法2: Node.js服务器
```bash
cd ai-evolution-game
npm install
npm run dev-node
```

### 方法3: 直接使用任何HTTP服务器
游戏是纯静态文件，可以用任何HTTP服务器托管。

**游戏地址**: http://localhost:8080

## 游戏特色

- 🤖 **AI进化链**: 11阶段从比特到数字神格的进化体验
- 🎨 **赛博朋克视觉**: 5个动态环境，从电路板到数字宇宙
- ⚡ **5分钟体验**: 快节奏但有深度的游戏设计
- 🎭 **哲学结局**: 震撼的画面反转和深度思考
- 📱 **全平台支持**: 桌面和移动设备优化

## 技术栈

- **前端**: HTML5 Canvas + ES6 Modules + CSS3
- **物理引擎**: 自定义2D物理系统
- **音频**: Web Audio API + MP3回退
- **架构**: 模块化游戏引擎设计

## 开发状态

当前实现进度: 3/67 任务完成

### 已完成
- ✅ 项目结构搭建
- ✅ HTML主框架和响应式设计
- ✅ ES6模块化游戏系统架构
- ✅ 开发服务器配置

### 进行中
- 🔄 核心游戏引擎实现
- 🔄 物理系统开发
- 🔄 AI进化机制

## 项目结构

```
ai-evolution-game/
├── index.html              # 主HTML文件
├── package.json            # 项目配置
├── css/                    # 样式文件
├── js/                     # JavaScript代码
│   ├── main.js            # 主入口
│   ├── systems/           # 游戏系统模块
│   │   ├── GameEngine.js  # 游戏引擎
│   │   ├── Renderer.js    # 渲染系统
│   │   ├── Physics.js     # 物理系统
│   │   ├── Audio.js       # 音频系统
│   │   ├── Input.js       # 输入系统
│   │   ├── AIEvolution.js # AI进化系统
│   │   └── Narrative.js   # 叙事系统
│   ├── utils/             # 工具类
│   └── config/            # 配置文件
├── assets/                # 游戏资源
│   ├── sounds/            # 音频文件
│   └── sprites/           # 图像文件
└── docs/                  # 文档
```

## 游戏控制

- **鼠标点击/触摸**: 在顶部区域生成AI实体
- **自动合成**: 相同实体碰撞时自动进化
- **进度观察**: 通过UI面板跟踪进化进程

## 贡献指南

本项目使用OpenSpec工作流开发，详见 `openspec/changes/ai-evolution-game/` 目录下的设计文档。

## 许可证

MIT License - 详见 LICENSE 文件