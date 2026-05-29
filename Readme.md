Don't trust AI code.

----
# 🚀 IndexYK JSON Canvas Homepage / 导航白板首页

[中文](#-中文介绍) | [English](#-english-introduction)

---

## 🇨🇳 中文介绍

**IndexYK JSON Canvas Homepage** 是一款基于标准 **JSON Canvas** 开源白板数据格式的极客卡片导航白板首页程序。它打破了传统导航网站死板的格子布局，允许你像操作“思维导图”或“无穷画板”一样，自由地摆放、连线、缩放你的网址卡片，创造出完全属于你个人的“灵感地图导航”。

### ✨ 核心特性

- **🎨 无限 2D 白板画布**：支持鼠标中键/空格拖拽平移，滚轮中心缩放，体验丝滑流畅。
- **🔌 智能文字 Icon 生成**：当书签卡片没有封面图时，系统会根据网站名称自动提取并生成极具现代感的大字徽标（如 `GitHub` -> `GH`，`哔哩哔哩` -> `哔哩`），配以霓虹渐变底色，依然高颜值。
- **🖼️ 本地图片上传**：内置 Express + Multer 图片托管。在编辑框里点击“上传图片”，图片会自动存在你服务器的硬盘上，无需寻找第三方图床。
- **🔗 关系线连接 (Edges)**：支持在卡片间通过拉线创建带有关系说明文字的指向箭头（支持标准 JSON Canvas 边线），方便进行分类与导向。
- **💾 完美的 Docker 数据持久化**：精心设计的 `data/` 目录收纳机制，无论是白板数据库文件还是上传的图片，只需挂载一个目录即可实现完美的数据持久化，无惧容器重建。
- **🌐 跨设备多端同步**：运行在服务器上后，任何设备（电脑、平板、手机）访问均可获得实时同步的完全一致性体验。
- **💾 标准 JSON Canvas 兼容**：支持导入与导出标准的 `.canvas` 文件，完美兼容 Obsidian Canvas 等支持该标准的第三方工具。

### 🛠️ 快速本地与服务器部署

#### 准备工作
确保你的机器上安装了 **Docker** 和 **Docker Compose**。

#### 一键启动部署
1. 克隆本项目代码：
   ```bash
   git clone <你的仓库地址>
   cd <项目目录>
   ```
2. 启动容器：
   ```bash
   docker compose up -d --build
   ```
3. 访问网页：
   打开浏览器，访问 `http://localhost:3000`（或服务器 IP:3000）。

#### 📁 数据备份
你所有的白板节点、连接线数据和上传的图片都保存在项目根目录下的 **`data/`** 文件夹中。你只需要定期备份这个文件夹即可。

### ⌨️ 快捷操作指南

| 按键 / 动作 | 操作效果 |
| :--- | :--- |
| **Tab 键** | 快速切换“浏览模式”与“编辑模式” |
| **空格 + 鼠标左键拖拽** | 移动 / 平移画布 (浏览模式与编辑模式均可用) |
| **鼠标中键按住并拖拽** | 移动 / 平移画布 |
| **鼠标滚轮** | 以鼠标光标为中心的视口放大与缩小 |
| **拖拽卡片边缘圆点** | *(编辑模式)* 在卡片间绘制关系连线箭头 |
| **点击连线 / 连线文字** | *(编辑模式)* 修改连线说明或删除连线 |
| **卡片右下角三角手柄** | *(编辑模式)* 任意调整卡片宽高大小 |

---

## 🇺🇸 English Introduction

**IndexYK JSON Canvas Homepage** is a visually stunning, highly interactive geeks' bookmark dashboard based on the open-source **JSON Canvas** specification. Breaking free from traditional rigid grid link directories, it allows you to organize, drag, resize, and connect your favorite web cards on an endless whiteboard viewport—like building a custom mind-map of your digital universe.

### ✨ Key Features

- **🎨 Infinite 2D Workspace**: Seamless panning (Spacebar + drag or Middle-click) and mouse-pointer centric zooming.
- **🔌 Typographic Initial Icons**: Automatically extracts and designs striking stylized letter logos (e.g., `GitHub` -> `GH`, `ChatGPT` -> `CH`) with high-contrast ambient text glows if a cover image is omitted.
- **🖼️ Self-Hosted Image Uploads**: Built-in Express + Multer upload endpoints. Upload local images directly inside the card editor—no external image hosts needed!
- **🔗 Visual Relationship Lines (Edges)**: Connect bookmarks using customizable direction arrows with textual relation descriptions (fully compliant with standard JSON Canvas specification).
- **💾 Ultimate Docker Volume Persistence**: Restructured directory storing both database `data.canvas` and uploads inside a single `data/` folder, making host folder bind mounts robust and bulletproof.
- **🌐 Seamless Multi-Device Syncing**: Hosted on your own server, accessing it from any workstation, tablet, or phone updates the same backend storage in real-time.
- **💾 Standard `.canvas` Compliant**: Universal export and import of `.canvas` schemas, fully compatible with tools like Obsidian Canvas.

### 🛠️ Quick Deployment

#### Prerequisites
Ensure **Docker** and **Docker Compose** are installed on your target machine.

#### One-Command Run
1. Clone this repository:
   ```bash
   git clone <your-repository-url>
   cd <project-directory>
   ```
2. Build and spin up the container:
   ```bash
   docker compose up -d --build
   ```
3. Open your dashboard:
   Point your browser to `http://localhost:3000` (or server-ip:3000).

#### 📁 Data Backup
All database notes, custom colors, coordinates, relations, and uploaded pictures are consolidated inside the **`data/`** directory on your host. Simply back up this single directory.

### ⌨️ Interaction Shortcuts

| Control / Action | Behavior |
| :--- | :--- |
| **Tab Key** | Toggle between **View Mode** and **Edit Mode** |
| **Spacebar + Left Drag** | Pan across the infinite board |
| **Middle Click + Drag** | Pan across the infinite board |
| **Mouse Scroll Wheel** | Zoom in and out relative to your mouse pointer |
| **Drag Edge Dots** | *(Edit Mode)* Connect cards using relational bezier lines |
| **Click Connection Line** | *(Edit Mode)* Edit relation labels or delete connection |
| **Bottom-Right Handle** | *(Edit Mode)* Scale and resize cards freely |
