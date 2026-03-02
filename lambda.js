import { handle } from 'hono/aws-lambda'
import { readFileSync, existsSync } from 'node:fs'
import { join, extname, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createApp } from './app.js'
import { createDynamoStorage } from './storage/dynamodb.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'application/javascript; charset=utf-8',
}

const app = createApp(createDynamoStorage())

app.get('/*', (c) => {
  const pathname = c.req.path === '/' ? '/index.html' : c.req.path
  const filePath = join(__dirname, 'public', pathname)
  if (existsSync(filePath)) {
    const ext = extname(filePath)
    return c.body(readFileSync(filePath, 'utf-8'), 200, {
      'Content-Type': MIME[ext] ?? 'text/plain',
    })
  }
  return c.notFound()
})

export const handler = handle(app)
