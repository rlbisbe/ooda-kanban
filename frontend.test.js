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

  test('card div has draggable attribute', () => {
    const el = makeCard()
    assert.equal(el.querySelector('.card').getAttribute('draggable'), 'true')
  })

  test('dragstart stores card id in dataTransfer', () => {
    const el = makeCard({ id: '5' })
    const stored = {}
    const e = new win.Event('dragstart', { bubbles: true })
    e.dataTransfer = { setData: (k, v) => { stored[k] = v }, effectAllowed: 'move' }
    el.querySelector('.card').dispatchEvent(e)
    assert.equal(stored['text/plain'], '5')
  })

  test('dragstart adds dragging class', () => {
    const el = makeCard()
    const e = new win.Event('dragstart', { bubbles: true })
    e.dataTransfer = { setData: () => {}, effectAllowed: 'move' }
    el.querySelector('.card').dispatchEvent(e)
    assert.ok(el.classList.contains('dragging'))
  })

  test('dragend removes dragging class', () => {
    const el = makeCard()
    el.classList.add('dragging')
    el.querySelector('.card').dispatchEvent(new win.Event('dragend', { bubbles: true }))
    assert.ok(!el.classList.contains('dragging'))
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

  test('drop on a different column fires card-move', async () => {
    const cards = [{ id: '1', title: 'Task', column: 'todo' }]
    const el = await makeBoard(cards)

    let captured = null
    el.addEventListener('card-move', e => { captured = e.detail })

    const dropEvent = new win.Event('drop', { bubbles: true, cancelable: true })
    dropEvent.dataTransfer = { getData: () => '1', dropEffect: 'move' }
    el.querySelector('[data-column="doing"]').dispatchEvent(dropEvent)

    assert.deepEqual(captured, { id: '1', column: 'doing' })
  })

  test('drop on the same column does not fire card-move', async () => {
    const cards = [{ id: '1', title: 'Task', column: 'todo' }]
    const el = await makeBoard(cards)

    let captured = null
    el.addEventListener('card-move', e => { captured = e.detail })

    const dropEvent = new win.Event('drop', { bubbles: true, cancelable: true })
    dropEvent.dataTransfer = { getData: () => '1', dropEffect: 'move' }
    el.querySelector('[data-column="todo"]').dispatchEvent(dropEvent)

    assert.equal(captured, null)
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

  // ── view toggle ─────────────────────────────────────────────────────────────

  test('toolbar has view toggle buttons', async () => {
    const el = await makeBoard()
    assert.ok(el.querySelector('.view-btn[data-view="kanban"]'))
    assert.ok(el.querySelector('.view-btn[data-view="list"]'))
  })

  test('kanban view is active by default', async () => {
    const el = await makeBoard()
    assert.ok(el.querySelector('.view-btn[data-view="kanban"]').classList.contains('active'))
    assert.ok(!el.querySelector('.view-btn[data-view="list"]').classList.contains('active'))
  })

  test('clicking list view button switches to list view', async () => {
    const el = await makeBoard([{ id: '1', title: 'A', column: 'todo' }])
    el.querySelector('.view-btn[data-view="list"]').click()
    await new Promise(resolve => setTimeout(resolve, 0))
    assert.ok(el.querySelector('.list-view'))
    assert.ok(!el.querySelector('.board'))
    assert.ok(el.querySelector('.view-btn[data-view="list"]').classList.contains('active'))
  })

  test('clicking kanban view button switches back to board', async () => {
    const el = await makeBoard([{ id: '1', title: 'A', column: 'todo' }])
    el.querySelector('.view-btn[data-view="list"]').click()
    await new Promise(resolve => setTimeout(resolve, 0))
    el.querySelector('.view-btn[data-view="kanban"]').click()
    await new Promise(resolve => setTimeout(resolve, 0))
    assert.ok(el.querySelector('.board'))
    assert.ok(!el.querySelector('.list-view'))
  })

  // ── list view rendering ──────────────────────────────────────────────────────

  test('list view renders all cards as rows', async () => {
    const el = await makeBoard([
      { id: '1', title: 'Alpha', column: 'todo' },
      { id: '2', title: 'Beta', column: 'doing' },
    ])
    el.querySelector('.view-btn[data-view="list"]').click()
    await new Promise(resolve => setTimeout(resolve, 0))
    assert.equal(el.querySelectorAll('.list-row').length, 2)
  })

  test('list view shows status dropdowns with correct selected value', async () => {
    const el = await makeBoard([
      { id: '1', title: 'A', column: 'doing' },
    ])
    el.querySelector('.view-btn[data-view="list"]').click()
    await new Promise(resolve => setTimeout(resolve, 0))
    const sel = el.querySelector('.status-select')
    assert.equal(sel.value, 'doing')
  })

  test('list view sort control is visible', async () => {
    const el = await makeBoard()
    el.querySelector('.view-btn[data-view="list"]').click()
    await new Promise(resolve => setTimeout(resolve, 0))
    assert.ok(el.querySelector('.sort-select'))
  })

  test('list view sort control is hidden in kanban view', async () => {
    const el = await makeBoard()
    assert.ok(!el.querySelector('.sort-select'))
  })

  // ── list view status change ──────────────────────────────────────────────────

  test('changing status dropdown updates the card column', async () => {
    const cards = [{ id: '1', title: 'Task', column: 'todo', updatedAt: 1000 }]
    const el = await makeBoard(cards)
    el.querySelector('.view-btn[data-view="list"]').click()
    await new Promise(resolve => setTimeout(resolve, 0))

    const sel = el.querySelector('.status-select[data-id="1"]')
    sel.value = 'done'
    sel.dispatchEvent(new win.Event('change', { bubbles: true }))
    await new Promise(resolve => setTimeout(resolve, 0))

    // After re-render, the card should show done
    const updated = el.querySelector('.status-select[data-id="1"]')
    assert.equal(updated.value, 'done')
  })

  // ── list view delete ─────────────────────────────────────────────────────────

  test('delete button in list view removes the card', async () => {
    const cards = [{ id: '1', title: 'Task', column: 'todo' }]
    const el = await makeBoard(cards)
    el.querySelector('.view-btn[data-view="list"]').click()
    await new Promise(resolve => setTimeout(resolve, 0))

    el.querySelector('.list-delete-btn[data-id="1"]').click()
    await new Promise(resolve => setTimeout(resolve, 0))

    assert.equal(el.querySelectorAll('.list-row').length, 0)
  })

  // ── list view add card ───────────────────────────────────────────────────────

  test('add button in list view creates a card', async () => {
    const el = await makeBoard([])
    el.querySelector('.view-btn[data-view="list"]').click()
    await new Promise(resolve => setTimeout(resolve, 0))

    const input = el.querySelector('.list-add-input')
    const btn = el.querySelector('.list-add-btn')
    input.value = 'List card'
    btn.click()
    await new Promise(resolve => setTimeout(resolve, 0))

    assert.equal(el.querySelectorAll('.list-row').length, 1)
  })

  test('pressing Enter in list add input creates a card', async () => {
    const el = await makeBoard([])
    el.querySelector('.view-btn[data-view="list"]').click()
    await new Promise(resolve => setTimeout(resolve, 0))

    const input = el.querySelector('.list-add-input')
    input.value = 'Enter card'
    input.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    await new Promise(resolve => setTimeout(resolve, 0))

    assert.equal(el.querySelectorAll('.list-row').length, 1)
  })

  test('add button with empty input does nothing', async () => {
    const el = await makeBoard([])
    el.querySelector('.view-btn[data-view="list"]').click()
    await new Promise(resolve => setTimeout(resolve, 0))

    el.querySelector('.list-add-btn').click()
    await new Promise(resolve => setTimeout(resolve, 0))

    assert.equal(el.querySelectorAll('.list-row').length, 0)
  })

  // ── list view sorting ────────────────────────────────────────────────────────

  test('sorting by title orders rows alphabetically', async () => {
    const cards = [
      { id: '1', title: 'Zebra', column: 'todo', updatedAt: 3000 },
      { id: '2', title: 'Apple', column: 'doing', updatedAt: 2000 },
      { id: '3', title: 'Mango', column: 'done', updatedAt: 1000 },
    ]
    const el = await makeBoard(cards)
    el.querySelector('.view-btn[data-view="list"]').click()
    await new Promise(resolve => setTimeout(resolve, 0))

    const sel = el.querySelector('.sort-select')
    sel.value = 'title'
    sel.dispatchEvent(new win.Event('change', { bubbles: true }))
    await new Promise(resolve => setTimeout(resolve, 0))

    const titles = [...el.querySelectorAll('.list-card-title')].map(s => s.textContent)
    assert.deepEqual(titles, ['Apple', 'Mango', 'Zebra'])
  })

  test('sorting by status orders rows by column label', async () => {
    const cards = [
      { id: '1', title: 'A', column: 'todo', updatedAt: 3000 },
      { id: '2', title: 'B', column: 'done', updatedAt: 2000 },
      { id: '3', title: 'C', column: 'doing', updatedAt: 1000 },
    ]
    const el = await makeBoard(cards)
    el.querySelector('.view-btn[data-view="list"]').click()
    await new Promise(resolve => setTimeout(resolve, 0))

    const sel = el.querySelector('.sort-select')
    sel.value = 'status'
    sel.dispatchEvent(new win.Event('change', { bubbles: true }))
    await new Promise(resolve => setTimeout(resolve, 0))

    const statuses = [...el.querySelectorAll('.status-select')].map(s => s.value)
    // Doing, Done, To Do → alphabetically
    assert.deepEqual(statuses, ['doing', 'done', 'todo'])
  })

  test('sorting by updatedAt orders by newest first', async () => {
    const cards = [
      { id: '1', title: 'Oldest', column: 'todo', updatedAt: 1000 },
      { id: '2', title: 'Newest', column: 'doing', updatedAt: 3000 },
      { id: '3', title: 'Middle', column: 'done', updatedAt: 2000 },
    ]
    const el = await makeBoard(cards)
    el.querySelector('.view-btn[data-view="list"]').click()
    await new Promise(resolve => setTimeout(resolve, 0))

    // updatedAt is default, but let's explicitly select it
    const sel = el.querySelector('.sort-select')
    sel.value = 'updatedAt'
    sel.dispatchEvent(new win.Event('change', { bubbles: true }))
    await new Promise(resolve => setTimeout(resolve, 0))

    const titles = [...el.querySelectorAll('.list-card-title')].map(s => s.textContent)
    assert.deepEqual(titles, ['Newest', 'Middle', 'Oldest'])
  })

  // ── list view inline title edit ──────────────────────────────────────────────

  test('clicking a title in list view enters edit mode', async () => {
    const el = await makeBoard([{ id: '1', title: 'Editable', column: 'todo' }])
    el.querySelector('.view-btn[data-view="list"]').click()
    await new Promise(resolve => setTimeout(resolve, 0))

    el.querySelector('.list-card-title[data-id="1"]').click()
    assert.ok(el.querySelector('.list-title-input'))
  })

  test('Enter saves new title in list view', async () => {
    const el = await makeBoard([{ id: '1', title: 'Old', column: 'todo' }])
    el.querySelector('.view-btn[data-view="list"]').click()
    await new Promise(resolve => setTimeout(resolve, 0))

    el.querySelector('.list-card-title[data-id="1"]').click()
    const input = el.querySelector('.list-title-input')
    input.value = 'New Title'
    input.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    await new Promise(resolve => setTimeout(resolve, 0))

    assert.ok(!el.querySelector('.list-title-input'))
    assert.equal(el.querySelector('.list-card-title[data-id="1"]').textContent, 'New Title')
  })

  test('Escape cancels title edit in list view', async () => {
    const el = await makeBoard([{ id: '1', title: 'Original', column: 'todo' }])
    el.querySelector('.view-btn[data-view="list"]').click()
    await new Promise(resolve => setTimeout(resolve, 0))

    el.querySelector('.list-card-title[data-id="1"]').click()
    const input = el.querySelector('.list-title-input')
    input.value = 'Changed'
    input.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await new Promise(resolve => setTimeout(resolve, 0))

    assert.equal(el.querySelector('.list-card-title[data-id="1"]').textContent, 'Original')
  })
})
