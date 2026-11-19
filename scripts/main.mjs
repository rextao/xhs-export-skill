#!/usr/bin/env node

import { execSync } from 'child_process'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import * as readline from 'readline'

const __dirname = dirname(fileURLToPath(import.meta.url))

const configPath = join(__dirname, 'config.json')
let config

try {
  config = JSON.parse(readFileSync(configPath, 'utf8'))
} catch (e) {
  console.error(`读取 config.json 失败: ${e.message}`)
  process.exit(1)
}

if (!Array.isArray(config) || config.length === 0 || !config.every(item => item.tag && Array.isArray(item.topics))) {
  console.error('config.json 格式错误，必须是 [{ "tag": "名称", "topics": ["词1", "词2"] }] 格式')
  process.exit(1)
}

console.log('请选择要执行的分类：')
config.forEach((item, i) => {
  console.log(`  ${i + 1}. ${item.tag}（${item.topics.length} 个搜索词）`)
})

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

rl.question('\n输入序号: ', (answer) => {
  rl.close()
  const index = parseInt(answer, 10) - 1

  if (isNaN(index) || index < 0 || index >= config.length) {
    console.error('无效序号')
    process.exit(1)
  }

  const { tag, topics } = config[index]
  console.log(`\n已选择「${tag}」，共 ${topics.length} 个搜索词\n`)

  function sleep(ms) {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
  }

  function randomDelayMinutes(minMin, maxMin) {
    const ms = (minMin + Math.random() * (maxMin - minMin)) * 60 * 1000
    const seconds = Math.round(ms / 1000)
    console.log(`等待 ${Math.floor(seconds / 60)} 分 ${seconds % 60} 秒后继续...`)
    sleep(Math.floor(ms))
  }

  const searchScript = join(__dirname, 'search.mjs')

  for (let i = 0; i < topics.length; i++) {
    const keyword = topics[i]
    console.log(`\n[${i + 1}/${topics.length}] 开始搜索: ${keyword}`)

    try {
      execSync(`node "${searchScript}" "${keyword}" "${tag}"`, { stdio: 'inherit' })
    } catch (e) {
      console.error(`搜索 "${keyword}" 失败: ${e.message}`)
    }

    if (i < topics.length - 1) {
      randomDelayMinutes(1, 5)
    }
  }

  console.log('\n所有搜索词处理完毕！')
})
