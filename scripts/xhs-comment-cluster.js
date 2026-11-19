#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync, renameSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const DATA_DIR = join(ROOT, 'xhs-data')
const META_DIR = join(DATA_DIR, '.meta')
const PROCESSED_FILE = join(META_DIR, 'comment-processed.json')
const ARCHIVE_DIR = join(ROOT, '1-preArchive')

const COMMAND = process.argv[2]

function loadProcessed() {
  if (!existsSync(PROCESSED_FILE)) return []
  try {
    return JSON.parse(readFileSync(PROCESSED_FILE, 'utf8'))
  } catch {
    return []
  }
}

function saveProcessed(records) {
  if (!existsSync(META_DIR)) mkdirSync(META_DIR, { recursive: true })
  writeFileSync(PROCESSED_FILE, JSON.stringify(records, null, 2), 'utf8')
}

function scanArticles() {
  const articles = []

  function walk(dir, relPath) {
    const entries = readdirSync(dir)
    for (const entry of entries) {
      if (entry === '.meta') continue
      const fullPath = join(dir, entry)
      const stat = statSync(fullPath)
      if (stat.isDirectory()) {
        walk(fullPath, relPath ? `${relPath}/${entry}` : entry)
      } else if (entry.endsWith('.md')) {
        const content = readFileSync(fullPath, 'utf8')
        const commentSection = extractCommentSection(content)
        if (commentSection) {
          const comments = extractCommentItems(commentSection)
          articles.push({
            tag: relPath,
            file: entry,
            filePath: fullPath,
            commentCount: comments.length,
            commentSection,
            comments,
            fullContent: content,
          })
        }
      }
    }
  }

  walk(DATA_DIR, '')
  return articles
}

function extractCommentSection(content) {
  const lines = content.split('\n')
  let startIdx = -1
  let endIdx = lines.length

  for (let i = 0; i < lines.length; i++) {
    if (/^#{1,8} 评论聚类|^#{1,8} 评论/.test(lines[i])) {
      startIdx = i
      break
    }
  }

  if (startIdx === -1) return null

  for (let i = startIdx + 1; i < lines.length; i++) {
    if (/^#{1,8} /.test(lines[i]) && !/^#{1,8} 评论聚类|^#{1,8} 评论/.test(lines[i])) {
      endIdx = i
      break
    }
  }

  return lines.slice(startIdx, endIdx).join('\n')
}

function extractCommentItems(section) {
  const lines = section.split('\n')
  return lines
    .filter(l => /^- /.test(l.trim()))
    .map(l => l.trim().replace(/^- /, ''))
}

function replaceCommentSection(content, newCommentSection) {
  const lines = content.split('\n')
  let startIdx = -1
  let endIdx = lines.length

  for (let i = 0; i < lines.length; i++) {
    if (/^#{1,8} 评论聚类|^#{1,8} 评论/.test(lines[i])) {
      startIdx = i
      break
    }
  }

  if (startIdx === -1) return content

  for (let i = startIdx + 1; i < lines.length; i++) {
    if (/^#{1,8} /.test(lines[i]) && !/^#{1,8} 评论聚类|^#{1,8} 评论/.test(lines[i])) {
      endIdx = i
      break
    }
  }

  const before = lines.slice(0, startIdx).join('\n')
  const after = lines.slice(endIdx).join('\n')

  return before + '\n' + newCommentSection + '\n' + after
}

function getNonCommentContent(content) {
  const lines = content.split('\n')
  let startIdx = -1
  let endIdx = lines.length

  for (let i = 0; i < lines.length; i++) {
    if (/^#{1,8} 评论聚类|^#{1,8} 评论/.test(lines[i])) {
      startIdx = i
      break
    }
  }

  if (startIdx === -1) return content

  for (let i = startIdx + 1; i < lines.length; i++) {
    if (/^#{1,8} /.test(lines[i]) && !/^#{1,8} 评论聚类|^#{1,8} 评论/.test(lines[i])) {
      endIdx = i
      break
    }
  }

  return lines.slice(0, startIdx).join('\n') + '\n' + lines.slice(endIdx).join('\n')
}

function verifyWriteback(originalNonComment, newContent) {
  const newNonComment = getNonCommentContent(newContent)
  return newNonComment.trim() === originalNonComment.trim()
}

function formatClusteredComments(groups, totalCount) {
  if (totalCount < 3) {
    const allItems = groups.flatMap(g => g.items)
    let result = '## 评论\n\n'
    for (const item of allItems) {
      result += `- ${item}\n`
    }
    return result.trimEnd()
  }

  let result = '## 评论聚类\n\n'
  for (const group of groups) {
    result += `### ${group.title}（${group.items.length}条）\n\n`
    for (const item of group.items) {
      result += `- ${item}\n`
    }
    result += '\n'
  }
  return result.trimEnd()
}

function main() {
  if (!COMMAND) {
    console.error('用法: node xhs-comment-cluster.js <command>')
    console.error('')
    console.error('命令:')
    console.error('  scan       扫描待处理文章，输出JSON')
    console.error('  apply      应用聚类结果，写回+归档+更新记录')
    console.error('  report     输出处理报告')
    process.exit(1)
  }

  if (COMMAND === 'scan') {
    const processed = loadProcessed()
    const processedFiles = new Set(processed.map(r => r.file))

    const articles = scanArticles().filter(a => !processedFiles.has(join('1-preArchive', a.tag, a.file)))

    if (articles.length === 0) {
      console.log(JSON.stringify({ status: 'done', message: '所有文章评论已处理完毕。' }))
      return
    }

    const result = {
      status: 'pending',
      totalCount: articles.length,
      totalComments: articles.reduce((s, a) => s + a.commentCount, 0),
      articles: articles.map(a => ({
        tag: a.tag,
        file: a.file,
        filePath: a.filePath,
        commentCount: a.commentCount,
        comments: a.comments,
        nonCommentContent: getNonCommentContent(a.fullContent),
      })),
    }

    console.log(JSON.stringify(result, null, 2))
  }

  if (COMMAND === 'apply') {
    const inputPath = process.argv[3]
    if (!inputPath) {
      console.error('用法: node xhs-comment-cluster.js apply <cluster-result.json>')
      process.exit(1)
    }

    const clusterResult = JSON.parse(readFileSync(inputPath, 'utf8'))
    const processed = loadProcessed()
    const reportItems = []

    for (const item of clusterResult) {
      const { tag, file, filePath, groups, totalCount } = item

      const originalContent = readFileSync(filePath, 'utf8')
      const nonComment = getNonCommentContent(originalContent)

      const clusteredSection = formatClusteredComments(groups, totalCount)
      const newContent = replaceCommentSection(originalContent, clusteredSection)

      if (!verifyWriteback(nonComment, newContent)) {
        console.error(`验证失败: ${filePath}，非评论章节被修改`)
        process.exit(1)
      }

      writeFileSync(filePath, newContent, 'utf8')

      const destDir = join(ARCHIVE_DIR, tag)
      if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true })
      const destPath = join(destDir, file)

      renameSync(filePath, destPath)

      if (!existsSync(destPath) || existsSync(filePath)) {
        console.error(`移动失败: ${filePath}`)
        process.exit(1)
      }

      const now = new Date()
      const processedAt = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

      processed.push({
        file: join('1-preArchive', tag, file),
        tag,
        commentClustered: true,
        processedAt,
        commentCount: totalCount,
        clusterCount: groups.length,
      })

      reportItems.push({
        destPath: join('1-preArchive', tag, file),
        commentCount: totalCount,
        clusterCount: groups.length,
      })
    }

    saveProcessed(processed)

    console.log(JSON.stringify({ status: 'success', items: reportItems }, null, 2))
  }

  if (COMMAND === 'report') {
    const processed = loadProcessed()
    const totalArticles = processed.length
    const totalComments = processed.reduce((s, r) => s + r.commentCount, 0)
    const totalClusters = processed.reduce((s, r) => s + r.clusterCount, 0)

    let text = `=== xhs-comment-cluster 处理报告 ===\n\n`
    text += `处理文章：${totalArticles} 篇\n`
    text += `处理评论：${totalComments} 条\n`
    text += `生成主题组：${totalClusters} 组\n\n`
    text += `处理详情：\n`

    for (const r of processed) {
      text += `- ${r.file}（${r.commentCount}条评论 → ${r.clusterCount}组）\n`
    }

    text += `\n处理记录已更新：xhs-data/.meta/comment-processed.json`

    console.log(text)
  }
}

main()
