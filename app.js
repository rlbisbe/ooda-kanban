import { Hono } from 'hono'
import { cors } from 'hono/cors'

export function createApp(storage) {
  const app = new Hono()

  app.use('/api/*', cors())

  app.get('/api/cards', async (c) => {
    return c.json(await storage.list())
  })

  app.post('/api/cards', async (c) => {
    const { title, column = 'todo' } = await c.req.json()
    const now = Date.now()
    const card = { id: now.toString(), title, column, updatedAt: now }
    return c.json(await storage.create(card), 201)
  })

  app.patch('/api/cards/:id', async (c) => {
    const { id } = c.req.param()
    const updates = await c.req.json()
    const card = await storage.update(id, { ...updates, updatedAt: Date.now() })
    return card ? c.json(card) : c.json({ error: 'Not found' }, 404)
  })

  app.delete('/api/cards/:id', async (c) => {
    const { id } = c.req.param()
    await storage.delete(id)
    return c.json({ success: true })
  })

  return app
}
