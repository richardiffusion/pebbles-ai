# Pebbles AI: A Generative Cognitive Builder
### Pre-released version can be found here ↓
### 目前pebbles未发布版本可以在以下网址查看
[🔗 Live Demo / Pebbles AI]( www.richardiffusion.me/pebbles/app)

<div align="center">

[![English](https://img.shields.io/badge/Language-English-blue?style=for-the-badge)](#english)
[![中文](https://img.shields.io/badge/语言-中文-red?style=for-the-badge)](#chinese)

</div>

---

<a name="english"></a>
## 🇬🇧 English

### 📖 Introduction

**Pebbles AI** is an anti-fragmentation knowledge construction tool. Unlike traditional note-taking apps where knowledge remains static, Pebbles uses AI to generate structured, multi-dimensional cognitive artifacts. It forces interaction through editing and verification, helping users internalize information rather than just collecting it.
<img width="2850" height="1758" alt="image" src="https://github.com/user-attachments/assets/81beef31-8fa5-4471-b5ff-305ee90c28aa" />
<img width="2829" height="1809" alt="image" src="https://github.com/user-attachments/assets/5699ca29-f4c3-45fc-90a6-bf2f61986e5b" />

**The Core Metaphor:**
1.  **The Drop:** You cast a topic (a raw idea) into the system.
2.  **The Ripples:** The AI constructs a deep, structured knowledge page.
3.  **The Artifact:** You refine, edit, and verify the content, turning it into a solid "Pebble" (Knowledge Crystal).

### ✨ Key Features

* **🧠 Dual Cognitive Modes:**
    * **ELI5 Mode:** Simple metaphors and basic concepts for easy understanding.
    * **Academic Mode:** Deep dives with historical context, data, and technical theory.
    * *Switch between modes instantly using the Cognitive Slider.*

* **📝 Block-Based Magazine Editor:**
    * **WYSIWYG:** Fully editable titles, summaries, and main content.
    * **Block Management:** Insert new blocks (Text, Quote, Checklists) between paragraphs; move or delete blocks with ease.
    * **Smart Sidebar:** Contextual definitions, profiles, and statistics are separated for better readability.

* **🤖 AI-Assisted Writing:**
    * **Immersive Construction:** Visual terminal-style logs during initial generation.
    * **Floating AI Menu:** Select any text to Fix, Shorten, Expand, or Rewrite using DeepSeek or Gemini.
    * **Provider Switching:** Easily toggle between DeepSeek and Google Gemini backends via configuration.

* **✅ Socratic Verification:**
    * A built-in reflection layer asking 3 critical questions.
    * **Visual feedback:** Completing the verification turns the Pebble's status to "Verified" (Green Dot).
    * **Logic Loop:** Adding new questions or unchecking items reverts status to "Draft".

* **🗂️ The Archive (Knowledge Management):**
    * **Dual Views:** Vault (Grid with bottom preview) & Stream (List with side preview).
    * **Folder System:** Drag-and-drop organization, nesting, renaming, and "Ungrouping" (deleting folder but keeping content).
    * **Singleton Drafts:** Create empty notes manually. The system prevents clutter by reusing empty untitled drafts.

* **🔐 Multi-User System:**
    * Secure Authentication (OAuth2 + JWT).
    * Complete data isolation per user.

### 🛠️ Tech Stack

**Frontend:**
* **Framework:** React + TypeScript (Vite)
* **Styling:** Tailwind CSS (Stone/Paper aesthetic)
* **UI/Icons:** Lucide React, Framer Motion
* **State:** React Hooks + Optimistic UI updates

**Backend:**
* **Framework:** FastAPI (Python)
* **Database:** MongoDB (Async Motor driver)
* **Validation:** Pydantic Models
* **AI Service:** OpenAI SDK (for DeepSeek) & Google Generative AI SDK

### 📂 Project Structure

```bash
pebbles/
├── frontend/                 # React Application
│   ├── src/
│   │   ├── components/       # Reusable UI components (Sidebar, FloatingMenu, etc.)
│   │   ├── views/            # Main Pages (TheDrop, TheArtifact, TheArchive)
│   │   ├── services/         # API connectors (Axios)
│   │   └── types.ts          # Shared TypeScript interfaces
│   └── ...
├── backend/                  # FastAPI Application
│   ├── app/
│   │   ├── routers/          # API Endpoints (ai, pebbles, auth)
│   │   ├── models.py         # Pydantic Database Models
│   │   ├── ai_service.py     # AI Orchestration (DeepSeek/Gemini logic)
│   │   └── database.py       # MongoDB Connection
│   └── ...
└── ...
````

### 🚀 Getting Started

#### Prerequisites

  * Node.js & npm
  * Python 3.10+
  * MongoDB Instance (Local or Atlas)

#### 1\. Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Create a .env file in /backend
# See Configuration section below
uvicorn app.main:app --reload --port 8002
```

#### 2\. Frontend Setup

```bash
cd frontend
npm install
npm run dev
# App runs at http://localhost:3000
```

### ⚙️ Configuration (.env)

Create a `.env` file in the `backend/` directory:

```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=pebbles_db
SECRET_KEY=your_secret_key_for_jwt
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# AI Provider Configuration
# Options: 'deepseek' or 'gemini'
AI_PROVIDER=deepseek

# Keys
DEEPSEEK_API_KEY=your_deepseek_key
DEEPSEEK_BASE_URL=[https://api.deepseek.com](https://api.deepseek.com)
GEMINI_API_KEY=your_gemini_key
```

### 🤝 Contributing

1.  Fork the repository.
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`).
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4.  Push to the branch (`git push origin feature/AmazingFeature`).
5.  Open a Pull Request.

-----

\<a name="chinese"\>\</a\>

## 🇨🇳 中文 (Chinese)

[回到英文版 (Back to English)](https://www.google.com/search?q=%23english)

### 📖 简介

**Pebbles AI** 是一个反碎片化的知识构建工具。与传统的静态笔记应用不同，Pebbles 利用 AI 生成结构化、多维度的认知页面（Artifact）。它通过强制性的交互（编辑、重组、苏格拉底式验证），帮助用户将原本零散的信息内化为属于自己的“Pebble（知识结晶）”。

**核心隐喻：**

1.  **投石 (The Drop):** 抛出一个原始的想法或话题。
2.  **涟漪 (The Ripples):** AI 构建深度的、结构化的知识页面。
3.  **结晶 (The Artifact):** 你通过阅读、编辑和验证，将其固化为永久的知识。

### ✨ 核心功能

  * **🧠 双重认知模式 (Dual Cognitive Modes):**

      * **ELI5 模式:** 通俗易懂，侧重类比和基础概念。
      * **学术模式 (Academic):** 深度专业，包含历史背景、数据和理论支持。
      * *通过顶部的滑块（Cognitive Slider）无缝切换。*

  * **📝 杂志级块编辑器:**

      * **所见即所得:** 标题、摘要、正文均可直接点击编辑。
      * **版块管理:** 支持在段落间插入新内容（文本、引言、清单）；支持上下移动或删除版块。
      * **智能侧边栏:** 定义、人物档案、统计数据作为独立卡片分离显示，辅助阅读。

  * **🤖 AI 辅助写作:**

      * **沉浸式构建:** 生成过程中展示终端风格的思考日志。
      * **悬浮 AI 菜单:** 选中任意文本即可唤出菜单，进行润色、缩写、扩写或重写。
      * **多模型切换:** 支持在后端配置中一键切换 DeepSeek 或 Google Gemini 服务。

  * **✅ 苏格拉底式验证 (Socratic Verification):**

      * 底部的反思层，提供 3 个关键问题。
      * **视觉反馈:** 完成全选后，文章状态自动变为“Verified”（显示小绿点）。
      * **逻辑闭环:** 新增问题或取消勾选，状态自动回退为“Draft”。

  * **🗂️ 归档系统 (The Archive):**

      * **双视图:** Vault（网格+底部抽屉预览）和 Stream（列表+侧边预览）。
      * **文件夹管理:** 支持拖拽归档、重命名、嵌套，以及“解散文件夹”（Ungroup，删除文件夹但保留内容）。
      * **单例草稿:** 点击“Draft Empty”新建空白页时，系统会自动复用未修改的空白草稿，防止垃圾文件堆积。

  * **🔐 多用户系统:**

      * 完整的注册/登录流程（OAuth2 + JWT）。
      * 基于 `owner_id` 的严格数据隔离。

### 🛠️ 技术栈

**前端 (Frontend):**

  * **框架:** React + TypeScript (Vite)
  * **样式:** Tailwind CSS (Stone/Paper 质感配色)
  * **交互:** Lucide React (图标), Framer Motion (动画)
  * **状态:** React Hooks + 乐观更新 (Optimistic UI)

**后端 (Backend):**

  * **框架:** FastAPI (Python)
  * **数据库:** MongoDB (使用 Motor 异步驱动)
  * **验证:** Pydantic Models
  * **AI 服务:** OpenAI SDK (兼容 DeepSeek) & Google Generative AI SDK

### 📂 项目结构

见 [英文版结构说明](https://www.google.com/search?q=%23project-structure)。

### 🚀 快速开始

#### 环境要求

  * Node.js & npm
  * Python 3.10+
  * MongoDB 实例

#### 1\. 后端配置

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows 用户使用: venv\Scripts\activate
pip install -r requirements.txt

# 在 backend 目录下创建 .env 文件（配置参考下方）
uvicorn app.main:app --reload --port 8002
```

#### 2\. 前端配置

```bash
cd frontend
npm install
npm run dev
# 访问 http://localhost:3000
```

### ⚙️ 配置文件 (.env)

请在 `backend/` 目录下创建 `.env` 文件：

```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=pebbles_db
SECRET_KEY=请设置一个复杂的密钥
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# AI 提供商配置
# 可选值: 'deepseek' 或 'gemini'
AI_PROVIDER=deepseek

# API Keys
DEEPSEEK_API_KEY=your_deepseek_key
DEEPSEEK_BASE_URL=[https://api.deepseek.com](https://api.deepseek.com)
GEMINI_API_KEY=your_gemini_key
```

### 🤝 贡献指南

1.  Fork 本仓库。
2.  创建特性分支 (`git checkout -b feature/AmazingFeature`)。
3.  提交更改 (`git commit -m 'Add some AmazingFeature'`)。
4.  推送到分支 (`git push origin feature/AmazingFeature`)。
5.  发起 Pull Request。

-----

\<div align="center"\>
\<p\>Built with ❤️ by Pebbles Team\</p\>
\</div\>

```
```
