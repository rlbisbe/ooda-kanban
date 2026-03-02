import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { createApp } from './app.js'
import { createMemoryStorage } from './storage/memory.js'

const app = createApp(createMemoryStorage())

app.use('/*', serveStatic({ root: './public' }))

serve({ fetch: app.fetch, port: 3000 }, (info) => {
  console.log(`Server running at http://localhost:${info.port}`)
})
