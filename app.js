import { Hono } from 'hono'
import { cors } from 'hono/cors'

export function createApp() {
  const app = new Hono()

  let cards = [
    { id: '1', title: 'Observe the situation', column: 'done' },
    { id: '2', title: 'Orient and assess options', column: 'doing' },
    { id: '3', title: 'Decide on next action', column: 'todo' },
  ]

  app.use('/api/*', cors())

  app.get('/api/cards', (c) => c.json(cards))

  app.post('/api/cards', async (c) => {
    const { title, column = 'todo' } = await c.req.json()
    const card = { id: Date.now().toString(), title, column }
    cards.push(card)
    return c.json(card, 201)
  })

  app.patch('/api/cards/:id', async (c) => {
    const { id } = c.req.param()
    const updates = await c.req.json()
    cards = cards.map(card => card.id === id ? { ...card, ...updates } : card)
    const card = cards.find(card => card.id === id)
    return card ? c.json(card) : c.json({ error: 'Not found' }, 404)
  })

  app.delete('/api/cards/:id', (c) => {
    const { id } = c.req.param()
    cards = cards.filter(card => card.id !== id)
    return c.json({ success: true })
  })

  return app
}
