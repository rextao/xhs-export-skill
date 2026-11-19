# OpenCLI 小红书 (xiaohongshu) 命令列表

## 命令概览

| 命令 | 类型 | 说明 |
|------|------|------|
| `search <query>` | read | 搜索小红书笔记 |
| `note <note-id>` | read | 获取小红书笔记正文和互动数据 |
| `comments <note-id>` | read | 获取小红书笔记评论（支持楼中楼子回复） |
| `feed` | read | 小红书首页推荐 Feed (via Pinia Store Action) |
| `notifications` | read | 小红书通知 (mentions/likes/connections) |
| `download <note-id>` | read | 下载小红书笔记中的图片和视频 |
| `user <id>` | read | 查看用户公开笔记 |
| `creator-profile` | read | 小红书创作者账号信息 (粉丝/关注/获赞/成长等级) |
| `creator-stats` | read | 小红书创作者数据总览 (观看/点赞/收藏/评论/分享/涨粉，含每日趋势) |
| `creator-notes` | read | 小红书创作者笔记列表 + 每篇数据 (标题/日期/观看/点赞/收藏/评论) |
| `creator-note-detail <note-id>` | read | 小红书单篇笔记详情页数据 (笔记信息 + 核心/互动数据 + 观看来源 + 观众画像 + 趋势数据) |
| `creator-notes-summary` | read | 小红书最近笔记批量摘要 (列表 + 单篇关键数据汇总) |
| `publish <content>` | write | 小红书发布图文笔记 (creator center UI automation) |
| `delete-note <note-id>` | write | 删除小红书已发布笔记 (creator center UI automation) |

---

## 命令详情

### search

搜索小红书笔记

```bash
opencli xiaohongshu search <query> [options]
```

**参数：**

| 参数 | 必填 | 说明 |
|------|------|------|
| `<query>` | 是 | Search keyword |

**选项：**

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `--limit` | int | 20 | Number of results |

**输出列：** rank, title, author, likes, published_at, url

---

### note

获取小红书笔记正文和互动数据

```bash
opencli xiaohongshu note <note-id> [options]
```

**参数：**

| 参数 | 必填 | 说明 |
|------|------|------|
| `<note-id>` | 是 | Full Xiaohongshu note URL with xsec_token |

**输出列：** field, value

---

### comments

获取小红书笔记评论（支持楼中楼子回复）

```bash
opencli xiaohongshu comments <note-id> [options]
```

**参数：**

| 参数 | 必填 | 说明 |
|------|------|------|
| `<note-id>` | 是 | Full Xiaohongshu note URL with xsec_token |

**选项：**

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `--limit` | int | 20 | Number of top-level comments (max 50) |
| `--with-replies` | boolean | false | Include nested replies (楼中楼) |

**输出列：** rank, author, text, likes, time, is_reply, reply_to

---

### feed

小红书首页推荐 Feed (via Pinia Store Action)

```bash
opencli xiaohongshu feed [options]
```

**选项：**

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `--limit` | int | 20 | Number of items to return |

**输出列：** id, title, author, likes, type, url

---

### notifications

小红书通知 (mentions/likes/connections)

```bash
opencli xiaohongshu notifications [options]
```

**选项：**

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `--type` | str | mentions | Notification type: mentions, likes, or connections |
| `--limit` | int | 20 | Number of notifications to return |

**输出列：** rank, user, action, content, note, time

---

### download

下载小红书笔记中的图片和视频

```bash
opencli xiaohongshu download <note-id> [options]
```

**参数：**

| 参数 | 必填 | 说明 |
|------|------|------|
| `<note-id>` | 是 | Full Xiaohongshu note URL with xsec_token, or xhslink short link |

**选项：**

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `--output` | str | ./xiaohongshu-downloads | Output directory |

**输出列：** index, type, status, size

---

### user

查看用户公开笔记

```bash
opencli xiaohongshu user <id> [options]
```

**参数：**

| 参数 | 必填 | 说明 |
|------|------|------|
| `<id>` | 是 | User id or profile URL |

**选项：**

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `--limit` | int | 15 | Number of notes to return |

**输出列：** id, title, type, likes, url

---

### creator-profile

小红书创作者账号信息 (粉丝/关注/获赞/成长等级)

```bash
opencli xiaohongshu creator-profile [options]
```

**输出列：** field, value

---

### creator-stats

小红书创作者数据总览 (观看/点赞/收藏/评论/分享/涨粉，含每日趋势)

```bash
opencli xiaohongshu creator-stats [options]
```

**选项：**

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `--period` | str | seven | Stats period: seven or thirty |

**输出列：** metric, total, trend

---

### creator-notes

小红书创作者笔记列表 + 每篇数据 (标题/日期/观看/点赞/收藏/评论)

```bash
opencli xiaohongshu creator-notes [options]
```

**选项：**

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `--limit` | int | 20 | Number of notes to return |

**输出列：** rank, id, title, date, views, likes, collects, comments, url

---

### creator-note-detail

小红书单篇笔记详情页数据 (笔记信息 + 核心/互动数据 + 观看来源 + 观众画像 + 趋势数据)

```bash
opencli xiaohongshu creator-note-detail <note-id> [options]
```

**参数：**

| 参数 | 必填 | 说明 |
|------|------|------|
| `<note-id>` | 是 | Note ID (from creator-notes or note-detail page URL) |

**输出列：** section, metric, value, extra

---

### creator-notes-summary

小红书最近笔记批量摘要 (列表 + 单篇关键数据汇总)

```bash
opencli xiaohongshu creator-notes-summary [options]
```

**选项：**

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `--limit` | int | 3 | Number of recent notes to summarize |
| `--timeout` | int | 180 | Max seconds for the overall command |

**输出列：** rank, id, title, views, likes, collects, comments, shares, avg_view_time, rise_fans, top_source, top_interest, url

---

### publish

小红书发布图文笔记 (creator center UI automation)

```bash
opencli xiaohongshu publish <content> [options]
```

**参数：**

| 参数 | 必填 | 说明 |
|------|------|------|
| `<content>` | 是 | 笔记正文 |

**选项：**

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `--title` | str | — | 笔记标题 (最多20字)，必填 |
| `--images` | str | — | 图片路径，逗号分隔，最多9张 (jpg/png/gif/webp)，必填 |
| `--topics` | str | — | 话题标签，逗号分隔，不含 # 号 |
| `--draft` | bool | false | 保存为草稿，不直接发布 |

**输出列：** status, detail

---

### delete-note

删除小红书已发布笔记 (creator center UI automation)

```bash
opencli xiaohongshu delete-note <note-id> [options]
```

**参数：**

| 参数 | 必填 | 说明 |
|------|------|------|
| `<note-id>` | 是 | Note ID |

**选项：**

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `--execute` | boolean | false | 实际执行删除并确认。默认为 dry-run 仅验证 |

**输出列：** status, note_id, message

---

## 通用选项

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `-f, --format <fmt>` | 输出格式: table, plain, json, yaml, md, csv | table |
| `--trace <mode>` | Trace capture: off, on, retain-on-failure | off |
| `-v, --verbose` | Debug output | false |

## 浏览器通用选项

| 选项 | 说明 | 可选值 |
|------|------|--------|
| `--window <mode>` | Browser window mode | foreground, background |
| `--site-session <mode>` | Adapter site session lifecycle | ephemeral, persistent |
| `--keep-tab <bool>` | Keep the browser tab lease after command finishes | true, false |
