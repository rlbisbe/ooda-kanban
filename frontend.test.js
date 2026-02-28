import { test, describe, before, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { Window } from 'happy-dom'

// Create a single Happy DOM window and expose globals BEFORE component imports
const win = new Window({ url: 'http://localhost:3000' })

globalThis.window = win
globalThis.document = win.document
globalThis.customElements = win.customElements
globalThis.HTMLElement = win.HTMLElement
globalThis.CustomEvent = win.CustomEvent
globalThis.KeyboardEvent = win.KeyboardEvent
globalThis.Event = win.Event

before(async () => {
  // Dynamic import ensures globals are set up before customElements.define() runs
  await import('./public/components/kanban-board.js')
})

beforeEach(() => {
  win.document.body.innerHTML = ''
  globalThis.fetch = undefined
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeCard({ id = '1', title = 'Test task', column = 'todo' } = {}) {
  const el = win.document.createElement('kanban-card')
  el.setAttribute('card-id', id)
  el.setAttribute('title', title)
  el.setAttribute('column', column)
  win.document.body.appendChild(el)
  return el
}

function mockFetch(seedCards) {
  globalThis.fetch = async (url, opts = {}) => {
    const method = opts.method ?? 'GET'
    if (method === 'GET') return { json: async () => seedCards }
    if (method === 'POST') {
      const body = JSON.parse(opts.body)
      return { json: async () => ({ id: 'new-1', column: 'todo', ...body }) }
    }
    if (method === 'PATCH') {
      const id = url.split('/').pop()
      const updates = JSON.parse(opts.body)
      const card = seedCards.find(c => c.id === id) ?? {}
      return { json: async () => ({ ...card, ...updates }) }
    }
    if (method === 'DELETE') return { json: async () => ({ success: true }) }
  }
}

async function makeBoard(seedCards = []) {
  mockFetch(seedCards)
  const el = win.document.createElement('kanban-board')
  win.document.body.appendChild(el)
  await new Promise(resolve => setTimeout(resolve, 0))
  return el
}

// ── kanban-card ───────────────────────────────────────────────────────────────

describe('kanban-card', () => {
  test('renders the card title', () => {
    const el = makeCard({ title: 'Write unit tests' })
    assert.ok(el.querySelector('.card-title').textContent.includes('Write unit tests'))
  })

  test('escapes HTML in the title', () => {
    const el = makeCard({ title: '<script>alert(1)</script>' })
    const html = el.querySelector('.card-title').innerHTML
    assert.ok(!html.includes('<script>'))
    assert.ok(html.includes('&lt;script&gt;'))
  })

  test('left button is disabled when column is todo', () => {
    const el = makeCard({ column: 'todo' })
    assert.equal(el.querySelector('[data-action="move-left"]').disabled, true)
    assert.equal(el.querySelector('[data-action="move-right"]').disabled, false)
  })

  test('right button is disabled when column is done', () => {
    const el = makeCard({ column: 'done' })
    assert.equal(el.querySelector('[data-action="move-right"]').disabled, true)
    assert.equal(el.querySelector('[data-action="move-left"]').disabled, false)
  })

  test('both move buttons are enabled when column is doing', () => {
    const el = makeCard({ column: 'doing' })
    assert.equal(el.querySelector('[data-action="move-left"]').disabled, false)
    assert.equal(el.querySelector('[data-action="move-right"]').disabled, false)
  })

  test('left click fires card-move with previous column', () => {
    const el = makeCard({ id: '42', column: 'doing' })
    let captured = null
    win.document.body.addEventListener('card-move', e => { captured = e.detail })
    el.querySelector('[data-action="move-left"]').click()
    assert.deepEqual(captured, { id: '42', column: 'todo' })
  })

  test('right click fires card-move with next column', () => {
    const el = makeCard({ id: '42', column: 'doing' })
    let captured = null
    win.document.body.addEventListener('card-move', e => { captured = e.detail })
    el.querySelector('[data-action="move-right"]').click()
    assert.deepEqual(captured, { id: '42', column: 'done' })
  })

  test('delete click fires card-delete event', () => {
    const el = makeCard({ id: '7' })
    let captured = null
    win.document.body.addEventListener('card-delete', e => { captured = e.detail })
    el.querySelector('[data-action="delete"]').click()
    assert.deepEqual(captured, { id: '7' })
  })

  test('clicking title shows an input with the current value', () => {
    const el = makeCard({ title: 'Original' })
    el.querySelector('.card-title').click()
    const input = el.querySelector('.card-title-input')
    assert.ok(input)
    assert.equal(input.value, 'Original')
  })

  test('Enter with new title fires card-update and exits edit mode', () => {
    const el = makeCard({ id: '1', title: 'Original' })
    el.querySelector('.card-title').click()
    let captured = null
    win.document.body.addEventListener('card-update', e => { captured = e.detail })
    const input = el.querySelector('.card-title-input')
    input.value = 'Updated'
    input.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    assert.deepEqual(captured, { id: '1', title: 'Updated' })
    assert.ok(el.querySelector('.card-title'))
    assert.ok(!el.querySelector('.card-title-input'))
  })

  test('Enter with unchanged title does not fire card-update', () => {
    const el = makeCard({ title: 'Same' })
    el.querySelector('.card-title').click()
    let captured = null
    win.document.body.addEventListener('card-update', e => { captured = e.detail })
    const input = el.querySelector('.card-title-input')
    input.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    assert.equal(captured, null)
  })

  test('Enter with empty title does not fire card-update', () => {
    const el = makeCard({ title: 'Original' })
    el.querySelector('.card-title').click()
    let captured = null
    win.document.body.addEventListener('card-update', e => { captured = e.detail })
    const input = el.querySelector('.card-title-input')
    input.value = '   '
    input.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    assert.equal(captured, null)
  })

  test('Escape cancels edit without firing card-update', () => {
    const el = makeCard({ title: 'Original' })
    el.querySelector('.card-title').click()
    let captured = null
    win.document.body.addEventListener('card-update', e => { captured = e.detail })
    const input = el.querySelector('.card-title-input')
    input.value = 'Changed'
    input.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    assert.equal(captured, null)
    assert.ok(el.querySelector('.card-title'))
    assert.ok(!el.querySelector('.card-title-input'))
  })

  test('blur saves a changed title', () => {
    const el = makeCard({ id: '1', title: 'Original' })
    el.querySelector('.card-title').click()
    let captured = null
    win.document.body.addEventListener('card-update', e => { captured = e.detail })
    const input = el.querySelector('.card-title-input')
    input.value = 'Blur saved'
    input.dispatchEvent(new win.Event('blur'))
    assert.deepEqual(captured, { id: '1', title: 'Blur saved' })
  })
})

// ── kanban-board ──────────────────────────────────────────────────────────────

describe('kanban-board', () => {
  test('renders three columns', async () => {
    const el = await makeBoard()
    assert.equal(el.querySelectorAll('.column').length, 3)
  })

  test('renders correct column titles', async () => {
    const el = await makeBoard()
    const titles = [...el.querySelectorAll('.column-title')].map(t => t.textContent.trim())
    assert.deepEqual(titles, ['To Do', 'Doing', 'Done'])
  })

  test('places cards in the correct columns', async () => {
    const el = await makeBoard([
      { id: '1', title: 'A', column: 'todo' },
      { id: '2', title: 'B', column: 'doing' },
      { id: '3', title: 'C', column: 'done' },
    ])
    assert.equal(el.querySelector('[data-column="todo"]').querySelectorAll('kanban-card').length, 1)
    assert.equal(el.querySelector('[data-column="doing"]').querySelectorAll('kanban-card').length, 1)
    assert.equal(el.querySelector('[data-column="done"]').querySelectorAll('kanban-card').length, 1)
  })

  test('shows correct card count per column', async () => {
    const el = await makeBoard([
      { id: '1', title: 'A', column: 'todo' },
      { id: '2', title: 'B', column: 'todo' },
    ])
    const count = el.querySelector('[data-column="todo"] .column-count').textContent.trim()
    assert.equal(count, '2')
  })

  test('card-move re-renders card in new column', async () => {
    const cards = [{ id: '1', title: 'Task', column: 'todo' }]
    const el = await makeBoard(cards)

    el.dispatchEvent(new win.CustomEvent('card-move', {
      bubbles: true,
      detail: { id: '1', column: 'doing' },
    }))
    await new Promise(resolve => setTimeout(resolve, 0))

    assert.equal(el.querySelector('[data-column="todo"]').querySelectorAll('kanban-card').length, 0)
    assert.equal(el.querySelector('[data-column="doing"]').querySelectorAll('kanban-card').length, 1)
  })

  test('card-delete removes card from board', async () => {
    const cards = [{ id: '1', title: 'Task', column: 'todo' }]
    const el = await makeBoard(cards)

    el.dispatchEvent(new win.CustomEvent('card-delete', {
      bubbles: true,
      detail: { id: '1' },
    }))
    await new Promise(resolve => setTimeout(resolve, 0))

    assert.equal(el.querySelectorAll('kanban-card').length, 0)
  })

  test('add card button reveals input form', async () => {
    const el = await makeBoard()
    const col = el.querySelector('[data-column="todo"]')
    const form = col.querySelector('.add-card-form')
    const btn = col.querySelector('.add-card-btn')

    assert.equal(form.style.display, 'none')
    btn.click()
    assert.equal(form.style.display, 'block')
  })

  test('pressing Enter in add form creates a card', async () => {
    const el = await makeBoard([])
    const col = el.querySelector('[data-column="todo"]')
    col.querySelector('.add-card-btn').click()

    const input = col.querySelector('.add-card-form input')
    input.value = 'Brand new card'
    input.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    await new Promise(resolve => setTimeout(resolve, 0))

    const cards = el.querySelector('[data-column="todo"]').querySelectorAll('kanban-card')
    assert.equal(cards.length, 1)
    assert.equal(cards[0].getAttribute('title'), 'Brand new card')
  })

  test('card-update patches title and re-renders', async () => {
    const cards = [{ id: '1', title: 'Original', column: 'todo' }]
    const el = await makeBoard(cards)

    el.dispatchEvent(new win.CustomEvent('card-update', {
      bubbles: true,
      detail: { id: '1', title: 'Renamed' },
    }))
    await new Promise(resolve => setTimeout(resolve, 0))

    const card = el.querySelector('kanban-card')
    assert.equal(card.getAttribute('title'), 'Renamed')
  })

  test('pressing Escape in add form dismisses it', async () => {
    const el = await makeBoard([])
    const col = el.querySelector('[data-column="todo"]')
    col.querySelector('.add-card-btn').click()

    const input = col.querySelector('.add-card-form input')
    input.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await new Promise(resolve => setTimeout(resolve, 0))

    // After Escape, board re-renders — form should be hidden again
    const form = el.querySelector('[data-column="todo"] .add-card-form')
    assert.equal(form.style.display, 'none')
  })
})
