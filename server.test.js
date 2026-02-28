import { test, describe, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { createApp } from './app.js'

describe('GET /api/cards', () => {
  test('returns the seed cards', async () => {
    const app = createApp()
    const res = await app.request('/api/cards')
    assert.equal(res.status, 200)
    const body = await res.json()
    assert.equal(Array.isArray(body), true)
    assert.equal(body.length, 3)
  })

  test('each card has id, title, and column', async () => {
    const app = createApp()
    const res = await app.request('/api/cards')
    const body = await res.json()
    for (const card of body) {
      assert.ok(card.id)
      assert.ok(card.title)
      assert.ok(['todo', 'doing', 'done'].includes(card.column))
    }
  })
})

describe('POST /api/cards', () => {
  test('creates a card and returns 201', async () => {
    const app = createApp()
    const res = await app.request('/api/cards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'New task' }),
    })
    assert.equal(res.status, 201)
    const card = await res.json()
    assert.equal(card.title, 'New task')
    assert.equal(card.column, 'todo')
    assert.ok(card.id)
  })

  test('respects the column when provided', async () => {
    const app = createApp()
    const res = await app.request('/api/cards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Already doing', column: 'doing' }),
    })
    const card = await res.json()
    assert.equal(card.column, 'doing')
  })

  test('new card appears in GET /api/cards', async () => {
    const app = createApp()
    await app.request('/api/cards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Check me' }),
    })
    const res = await app.request('/api/cards')
    const cards = await res.json()
    assert.ok(cards.some(c => c.title === 'Check me'))
  })
})

describe('PATCH /api/cards/:id', () => {
  test('updates the title', async () => {
    const app = createApp()
    const cards = await app.request('/api/cards').then(r => r.json())
    const target = cards[0]

    const res = await app.request(`/api/cards/${target.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Renamed task' }),
    })
    assert.equal(res.status, 200)
    const updated = await res.json()
    assert.equal(updated.title, 'Renamed task')
    assert.equal(updated.id, target.id)
  })

  test('moves a card to a new column', async () => {
    const app = createApp()
    const cards = await app.request('/api/cards').then(r => r.json())
    const target = cards[0]

    const res = await app.request(`/api/cards/${target.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ column: 'todo' }),
    })
    assert.equal(res.status, 200)
    const updated = await res.json()
    assert.equal(updated.column, 'todo')
    assert.equal(updated.id, target.id)
  })

  test('returns 404 for unknown id', async () => {
    const app = createApp()
    const res = await app.request('/api/cards/nonexistent', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ column: 'done' }),
    })
    assert.equal(res.status, 404)
  })
})

describe('DELETE /api/cards/:id', () => {
  test('removes a card', async () => {
    const app = createApp()
    const cards = await app.request('/api/cards').then(r => r.json())
    const target = cards[0]

    const res = await app.request(`/api/cards/${target.id}`, { method: 'DELETE' })
    assert.equal(res.status, 200)
    const body = await res.json()
    assert.equal(body.success, true)

    const after = await app.request('/api/cards').then(r => r.json())
    assert.ok(!after.some(c => c.id === target.id))
  })

  test('deleting is idempotent (no error on missing id)', async () => {
    const app = createApp()
    const res = await app.request('/api/cards/nonexistent', { method: 'DELETE' })
    assert.equal(res.status, 200)
  })
})
