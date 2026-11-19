#!/usr/bin/env node

import { execSync } from 'child_process'
import { mkdirSync, existsSync, readdirSync, writeFileSync, rmSync, readFileSync } from 'fs'
import { join } from 'path'

const keyword = process.argv[2]
const tag = process.argv[3]

if (!keyword) {
  console.error('用法: node search.mjs <搜索词> [tag]')
  process.exit(1)
}

const OUTPUT_DIR = './xhs-data'
const KEYWORD_SLUG = keyword.replace(/ /g, '_')
const TAG_SLUG = tag ? tag.replace(/ /g, '_') : KEYWORD_SLUG
const KEYWORD_DIR = join(OUTPUT_DIR, TAG_SLUG, KEYWORD_SLUG)
const DOWNLOADED_FILE = join(OUTPUT_DIR, 'downloaded.json')

mkdirSync(KEYWORD_DIR, { recursive: true })

function loadDownloaded() {
  try {
    const arr = JSON.parse(readFileSync(DOWNLOADED_FILE, 'utf8'))
    const map = {}
    for (const item of arr) {
      const [noteId, data] = Object.entries(item)[0]
      map[noteId] = data
    }
    return map
  } catch {
    return {}
  }
}

function saveDownloaded(map) {
  const arr = Object.entries(map).map(([noteId, data]) => ({ [noteId]: data }))
  writeFileSync(DOWNLOADED_FILE, JSON.stringify(arr, null, 2))
}

const downloadedMap = loadDownloaded()

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
}

function randomDelay(min, max) {
  const ms = (min + Math.random() * (max - min)) * 1000
  sleep(Math.floor(ms))
}

function run(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] })
  } catch (e) {
    return e.stdout || e.stderr || ''
  }
}

function parseJson(str) {
  try {
    return JSON.parse(str)
  } catch {
    return []
  }
}

function extractNoteId(url) {
  const match = url.match(/(?:search_result|explore|note)\/([0-9a-f]{24})/i)
  return match ? match[1] : null
}

function isExisting(noteId) {
  return noteId in downloadedMap
}

console.log(`搜索: ${keyword}`)
const searchCmd = `opencli xiaohongshu search "${keyword}" -f json`
console.log(`  执行: ${searchCmd}`)
const searchRaw = run(searchCmd)

const searchResults = parseJson(searchRaw)

if (searchResults.length === 0) {
  console.log('  未获取到搜索结果，跳过')
  if (searchRaw) console.log(`  原始输出: ${searchRaw}`)
  process.exit(0)
}

console.log(`搜索结果: ${searchResults.length} 条`)

let noteNum = 0

for (let i = 0; i < searchResults.length; i++) {
  const { url: rawUrl, title } = searchResults[i]
  const url = rawUrl.replace('https://www.xiaohongshu.com/search_result/', 'https://www.xiaohongshu.com/explore/')
  const noteId = extractNoteId(url)

  if (!noteId) {
    console.log(`[${i + 1}/${searchResults.length}] 无法提取 note-id，跳过`)
    continue
  }

  console.log(`[${i + 1}/${searchResults.length}] ${noteId} - ${title}`)

  if (isExisting(noteId)) {
    console.log(`  重复笔记，已跳过 (noteId: ${noteId})`)
    continue
  }

  console.log('  下载图片...')
  randomDelay(10, 30)
  const downloadCmd = `opencli xiaohongshu download "${url}" --output "${KEYWORD_DIR}" -f json`
  console.log(`  执行: ${downloadCmd}`)
  const downloadRaw = run(downloadCmd)

  if (downloadRaw.includes('AuthRequiredError')) {
    console.log('  未登录小红书，请在 Chrome 中登录 xiaohongshu.com')
    process.exit(1)
  }

  if (downloadRaw.includes('SECURITY_BLOCK') || downloadRaw.includes('EmptyResultError')) {
    console.log('  安全拦截或笔记不存在，跳过')
    rmSync(join(KEYWORD_DIR, noteId), { recursive: true, force: true })
    continue
  }

  const downloadResult = parseJson(downloadRaw)
  const hasVideo = downloadResult.length > 0 && downloadResult.every(item => item.type === 'video')

  if (hasVideo) {
    console.log('  视频笔记，跳过')
    rmSync(join(KEYWORD_DIR, noteId), { recursive: true, force: true })
    continue
  }

  noteNum++

  console.log('  获取笔记详情...')
  randomDelay(10, 30)
  const noteRaw = run(`opencli xiaohongshu note "${url}" -f json`)
  const noteResult = parseJson(noteRaw)
  const rawContent = noteResult.find(item => item.field === 'content')?.value || ''
  const firstTagIndex = rawContent.search(/#\S/)
  const bodyPart = firstTagIndex > 0 ? rawContent.slice(0, firstTagIndex) : rawContent
  const tagPart = firstTagIndex > 0 ? rawContent.slice(firstTagIndex) : ''
  const content = bodyPart.split('\n').join('\n\n').trimEnd() + (tagPart ? '\n\n' + tagPart.split('\n').join('\n\n') : '')
  console.log(`  详情: ${content.slice(0, 50).replace(/\n/g, ' ')}${content.length > 50 ? '...' : ''}`)

  console.log('  获取评论...')
  randomDelay(10, 30)
  const commentsRaw = run(`opencli xiaohongshu comments "${url}" --limit 20 --with-replies -f json`)
  const commentsResult = parseJson(commentsRaw)
  console.log(`  评论: ${commentsResult.length} 条`)

  const imgDir = join(KEYWORD_DIR, noteId)
  let imageMd = ''
  if (existsSync(imgDir)) {
    const imgs = readdirSync(imgDir).filter(f => f.endsWith('.jpg')).sort()
    imageMd = imgs.map((_, idx) => `![${idx + 1}](${noteId}/${noteId}_${idx + 1}.jpg)`).join('\n')
  }

  const commentsMd = commentsResult.map(c => `- ${c.text}`).join('\n')

  const md = [
    `## 笔记 ${noteNum}`,
    '',
    '### 详情',
    '',
    content,
    '',
    '### 图片',
    '',
    imageMd,
    '',
    '### 评论',
    '',
    commentsMd,
  ].join('\n')

  writeFileSync(join(KEYWORD_DIR, `${noteId}.md`), md)
  downloadedMap[noteId] = searchResults[i]
  saveDownloaded(downloadedMap)
  console.log(`  已保存: ${noteId}.md`)
}

console.log(`完成！输出: ${KEYWORD_DIR}`)
