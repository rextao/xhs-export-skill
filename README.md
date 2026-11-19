# 小红书内容采集与知识库整理

这是一个基于 **OpenCLI + Node.js + Obsidian** 的小红书内容工作区，用于把搜索到的图文笔记沉淀为可检索、可复用的 Markdown 知识库。

项目的核心流程是：

```text
按分类和关键词搜索小红书
        ↓
过滤视频，下载图文笔记图片
        ↓
获取笔记正文和评论，保存为 Markdown
        ↓
评论主题聚类与归档
        ↓
相似笔记合并，生成知识文章和导航
```

当前知识库主要覆盖新西兰旅游、小学数学/语文规划、学习机、幼小衔接和北京周边旅游等主题。

## 主要功能

### 1. 批量搜索与下载

`scripts/main.mjs` 会读取 `scripts/config.json`，交互式选择一个分类，然后逐个执行该分类下的搜索词。每个搜索词之间会随机等待 1～5 分钟，以降低连续请求风险。

`scripts/search.mjs` 对单个关键词执行以下操作：

- 调用 `opencli xiaohongshu search` 获取搜索结果；
- 从结果 URL 中提取 24 位 `note-id`；
- 下载图片笔记，自动跳过视频笔记；
- 获取笔记正文和最多 20 条评论（包含回复）；
- 将内容写入独立 Markdown 文件，并保存图片相对路径；
- 使用 `xhs-data/downloaded.json` 做基础的全局去重。

### 2. 评论聚类

`scripts/xhs-comment-cluster.js` 负责扫描原始笔记的评论章节，并支持：

- `scan`：扫描待处理文章并输出评论数据；
- `apply`：将聚类结果写回原文章，只修改评论章节；
- `report`：查看评论处理报告；
- 将完成评论处理的文章归档到 `1-preArchive/`；
- 使用 `xhs-data/.meta/comment-processed.json` 记录处理状态。

评论聚类规则和输出格式见 [评论聚类 Skill](.agents/skills/xhs-comment-cluster/SKILL.md)。

### 3. 知识库整理

`.agents/skills/xhs-cluster/SKILL.md` 定义了笔记整理流程：在同一分类内跨关键词识别相似笔记，合并为主题文章；无法合并的笔记则独立整理，最终输出到 `xhs-wiki/`，并更新 `xhs-wiki/index.md`。

> 该流程目前以项目 Skill 规范为主，实际整理由 OmniRush.ai 按 Skill 执行，并不是一个独立的 Node CLI 命令。

## 快速开始

### 前置条件

- Node.js（建议使用较新的 LTS 版本）；
- 已安装并可运行 `opencli`；
- Chrome 已登录小红书；
- OpenCLI 浏览器连接正常。

先检查 OpenCLI：

```bash
opencli doctor
```

如果浏览器连接或登录态异常，请先在 Chrome 中登录 `xiaohongshu.com`，再重新执行检查。

### 批量采集一个分类

从项目根目录执行：

```bash
node scripts/main.mjs
```

随后输入分类序号。分类和搜索词在 [`scripts/config.json`](scripts/config.json) 中维护。

### 采集单个关键词

```bash
node scripts/search.mjs "小学数学规划" "小学数学"
```

参数说明：

```text
node scripts/search.mjs <搜索词> [分类]
```

建议始终在项目根目录执行，因为采集脚本当前使用相对路径 `./xhs-data`。

### 评论聚类

```bash
# 扫描待处理文章
node scripts/xhs-comment-cluster.js scan

# 根据临时聚类结果应用修改
node scripts/xhs-comment-cluster.js apply scripts/.cluster-temp.json

# 查看处理报告
node scripts/xhs-comment-cluster.js report
```

评论聚类需要 LLM 分析评论内容。`scan` 生成数据后，由 OmniRush.ai 或其他兼容流程生成 `scripts/.cluster-temp.json`，再执行 `apply`。

## 输出目录

```text
.
├── scripts/
│   ├── config.json                 # 分类与搜索词配置
│   ├── main.mjs                   # 交互式批量采集入口
│   ├── search.mjs                 # 单关键词采集脚本
│   └── xhs-comment-cluster.js     # 评论扫描、应用和报告
├── xhs-data/                      # 原始采集数据
│   ├── <分类>/<关键词>/
│   │   ├── search.json            # 搜索结果缓存
│   │   ├── <note-id>.md           # 笔记正文和评论
│   │   └── <note-id>/*.jpg        # 笔记图片
│   ├── downloaded.json            # 已采集 note-id 记录
│   └── .meta/                     # 聚类和归档处理记录
├── 1-preArchive/                  # 已完成评论处理的文章
├── 0-archive/                     # 已完成知识库整理的原始笔记
├── xhs-wiki/                      # 整理后的知识文章
│   └── index.md                   # 知识库导航
├── .agents/skills/                # 采集、评论聚类和知识整理规范
└── docs/                          # OpenCLI 小红书命令说明
```

典型的原始笔记结构：

```text
xhs-data/小学数学/小学数学规划/
├── search.json
├── 67xxxxxxxxxxxxxxxxxxxxxxxx.md
└── 67xxxxxxxxxxxxxxxxxxxxxxxx/
    ├── 67xxxxxxxxxxxxxxxxxxxxxxxx_1.jpg
    └── 67xxxxxxxxxxxxxxxxxxxxxxxx_2.jpg
```

## 配置搜索任务

编辑 [`scripts/config.json`](scripts/config.json)，按以下格式添加分类和搜索词：

```json
[
  {
    "tag": "示例分类",
    "topics": [
      "搜索词一",
      "搜索词二"
    ]
  }
]
```

分类名和搜索词会用于目录名和 OpenCLI 命令参数。包含特殊 Shell 字符的内容可能导致命令解析异常，建议使用普通中文、英文和空格。

## 重要注意事项

### 登录、反爬和网络依赖

采集依赖小红书登录态、Chrome 浏览器连接和 OpenCLI。可能遇到登录失效、安全拦截、笔记不存在或搜索结果为空等情况。脚本会跳过部分失败项，但不能保证每次采集完整。

### 数据安全

小红书 URL 可能携带 `xsec_token` 等签名参数。`xhs-data/` 中的搜索缓存和采集记录不应直接发布到公共仓库，也不要把这些 URL 写入公开日志或 issue。

### 当前实现边界

- 项目没有 `package.json`，目前不提供 `npm install`、`npm test` 等标准命令；
- 没有自动化测试和 CI，验证以手工执行为主；
- `search.mjs` 当前按 `.jpg` 识别图片，其他图片格式可能不会自动写入 Markdown；
- `search.mjs` 使用相对输出目录，必须从项目根目录执行；
- 评论聚类脚本使用 ESM `import`。如果当前 Node 环境未将 `.js` 识别为 ESM，可能需要先将脚本改为 `.mjs` 或补充 ESM 配置后再运行。

## 相关文档

- [小红书 OpenCLI 命令说明](docs/xiaohongshu-commands.md)
- [小红书搜索与下载 Skill](.agents/skills/xiaohongshu-search-download/SKILL.md)
- [评论聚类 Skill](.agents/skills/xhs-comment-cluster/SKILL.md)
- [知识库聚类 Skill](.agents/skills/xhs-cluster/SKILL.md)
- [知识库导航](xhs-wiki/index.md)

## 项目状态

这是一个面向个人/团队内容研究流程的 Obsidian 工作区，不是通用的小红书 SDK。当前重点是稳定采集、保留原始资料，以及持续完善 `xhs-wiki/` 中的结构化知识文章。
