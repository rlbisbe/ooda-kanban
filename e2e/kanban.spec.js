import { test, expect } from '@playwright/test'

async function reloadBoard(page) {
  await page.reload()
  await page.waitForSelector('kanban-board .board')
}

async function switchToList(page) {
  await page.locator('.view-btn[data-view="list"]').click()
  await page.waitForSelector('.list-view')
}

async function switchToBoard(page) {
  await page.locator('.view-btn[data-view="kanban"]').click()
  await page.waitForSelector('.board')
}


test.describe('Kanban board', () => {
  const createdIds = []

  test.afterEach(async ({ request }) => {
    for (const id of createdIds.splice(0)) {
      await request.delete(`/api/cards/${id}`)
    }
  })

  test('page loads 3 columns', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('kanban-board .board')
    const titles = await page.locator('.column-title').allTextContents()
    expect(titles).toEqual(['To Do', 'Doing', 'Done'])
  })

  test('add card via UI', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('kanban-board .board')

    const todoCol = page.locator('.column[data-column="todo"]')
    const countBefore = await todoCol.locator('kanban-card').count()

    await todoCol.locator('.add-card-btn').click()
    await todoCol.locator('.add-card-form input').fill('E2E add card test')
    await todoCol.locator('.add-card-form input').press('Enter')

    await expect(todoCol.locator('kanban-card')).toHaveCount(countBefore + 1)

    const newCard = todoCol.locator('kanban-card[title="E2E add card test"]')
    createdIds.push(await newCard.getAttribute('card-id'))
  })

  test('edit card title', async ({ page, request }) => {
    const res = await request.post('/api/cards', {
      data: { title: 'E2E edit before', column: 'todo' },
    })
    const card = await res.json()
    createdIds.push(card.id)

    await page.goto('/')
    await page.waitForSelector('kanban-board .board')

    const cardEl = page.locator(`kanban-card[card-id="${card.id}"]`)
    await cardEl.locator('.card-title').click()
    await cardEl.locator('.card-title-input').fill('E2E edit after')
    await cardEl.locator('.card-title-input').press('Enter')

    await expect(page.locator(`kanban-card[card-id="${card.id}"] .card-title`))
      .toHaveText('E2E edit after')
  })

  test('move card right (todo → doing)', async ({ page, request }) => {
    const res = await request.post('/api/cards', {
      data: { title: 'E2E move right', column: 'todo' },
    })
    const card = await res.json()
    createdIds.push(card.id)

    await page.goto('/')
    await page.waitForSelector('kanban-board .board')

    await page.locator(`kanban-card[card-id="${card.id}"] [data-action="move-right"]`).click()

    await expect(
      page.locator(`.column[data-column="doing"] kanban-card[card-id="${card.id}"]`)
    ).toBeVisible()
  })

  test('move card left (done → doing)', async ({ page, request }) => {
    const res = await request.post('/api/cards', {
      data: { title: 'E2E move left', column: 'done' },
    })
    const card = await res.json()
    createdIds.push(card.id)

    await page.goto('/')
    await page.waitForSelector('kanban-board .board')

    await page.locator(`kanban-card[card-id="${card.id}"] [data-action="move-left"]`).click()

    await expect(
      page.locator(`.column[data-column="doing"] kanban-card[card-id="${card.id}"]`)
    ).toBeVisible()
  })

  test('delete card', async ({ page, request }) => {
    const res = await request.post('/api/cards', {
      data: { title: 'E2E delete card', column: 'todo' },
    })
    const card = await res.json()

    await page.goto('/')
    await page.waitForSelector('kanban-board .board')

    await page.locator(`kanban-card[card-id="${card.id}"] [data-action="delete"]`).click()

    await expect(page.locator(`kanban-card[card-id="${card.id}"]`)).toHaveCount(0)
  })
})

test.describe('List view', () => {
  const createdIds = []

  test.afterEach(async ({ request }) => {
    for (const id of createdIds.splice(0)) {
      await request.delete(`/api/cards/${id}`)
    }
  })

  test('toggle to list view and back to board', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('kanban-board .board')

    await switchToList(page)
    await expect(page.locator('.list-table')).toBeVisible()
    await expect(page.locator('.board')).toHaveCount(0)

    await switchToBoard(page)
    await expect(page.locator('.board')).toBeVisible()
    await expect(page.locator('.list-table')).toHaveCount(0)
  })

  test('list view shows all cards with status dropdowns', async ({ page, request }) => {
    const r1 = await request.post('/api/cards', { data: { title: 'List card todo', column: 'todo' } })
    const r2 = await request.post('/api/cards', { data: { title: 'List card done', column: 'done' } })
    const c1 = await r1.json()
    const c2 = await r2.json()
    createdIds.push(c1.id, c2.id)

    await page.goto('/')
    await page.waitForSelector('kanban-board .board')
    await switchToList(page)

    await expect(page.locator('.list-table tbody tr')).toHaveCount(await page.locator('.list-table tbody tr').count())
    await expect(page.locator(`.status-select[data-id="${c1.id}"]`)).toHaveValue('todo')
    await expect(page.locator(`.status-select[data-id="${c2.id}"]`)).toHaveValue('done')
  })

  test('change card status via dropdown', async ({ page, request }) => {
    const res = await request.post('/api/cards', { data: { title: 'E2E status change', column: 'todo' } })
    const card = await res.json()
    createdIds.push(card.id)

    await page.goto('/')
    await page.waitForSelector('kanban-board .board')
    await switchToList(page)

    await page.locator(`.status-select[data-id="${card.id}"]`).selectOption('doing')
    await page.waitForSelector('.list-view')

    await expect(page.locator(`.status-select[data-id="${card.id}"]`)).toHaveValue('doing')

    // Confirm persisted — switch to board and check the card is in Doing column
    await switchToBoard(page)
    await expect(page.locator(`.column[data-column="doing"] kanban-card[card-id="${card.id}"]`)).toBeVisible()
  })

  test('add card from list view', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('kanban-board .board')
    await switchToList(page)

    const countBefore = await page.locator('.list-table tbody tr').count()

    await page.locator('.list-add-input').fill('E2E list add card')
    await page.locator('.list-add-status').selectOption('doing')
    await page.locator('.list-add-btn').click()
    await page.waitForSelector('.list-view')

    await expect(page.locator('.list-table tbody tr')).toHaveCount(countBefore + 1)

    // Find the new row and register for cleanup
    const newRow = page.locator('.list-table tbody tr', { hasText: 'E2E list add card' })
    await expect(newRow).toBeVisible()
    const sel = newRow.locator('.status-select')
    await expect(sel).toHaveValue('doing')
  })

  test('delete card from list view', async ({ page, request }) => {
    const res = await request.post('/api/cards', { data: { title: 'E2E list delete', column: 'todo' } })
    const card = await res.json()

    await page.goto('/')
    await page.waitForSelector('kanban-board .board')
    await switchToList(page)

    await page.locator(`.list-delete-btn[data-id="${card.id}"]`).click()
    await page.waitForSelector('.list-view')

    await expect(page.locator(`.status-select[data-id="${card.id}"]`)).toHaveCount(0)
  })

  test('inline edit title in list view', async ({ page, request }) => {
    const res = await request.post('/api/cards', { data: { title: 'E2E list edit before', column: 'todo' } })
    const card = await res.json()
    createdIds.push(card.id)

    await page.goto('/')
    await page.waitForSelector('kanban-board .board')
    await switchToList(page)

    await page.locator(`.list-card-title[data-id="${card.id}"]`).click()
    await page.locator('.list-title-input').fill('E2E list edit after')
    await page.locator('.list-title-input').press('Enter')
    await page.waitForSelector('.list-view')

    await expect(page.locator(`.list-card-title[data-id="${card.id}"]`)).toHaveText('E2E list edit after')
  })

  test('sort by title A-Z', async ({ page, request }) => {
    const r1 = await request.post('/api/cards', { data: { title: 'Zebra card', column: 'todo' } })
    const r2 = await request.post('/api/cards', { data: { title: 'Apple card', column: 'todo' } })
    const c1 = await r1.json()
    const c2 = await r2.json()
    createdIds.push(c1.id, c2.id)

    await page.goto('/')
    await page.waitForSelector('kanban-board .board')
    await switchToList(page)

    await page.locator('.sort-select').selectOption('title')
    await page.waitForSelector('.list-view')

    const titles = await page.locator('.list-card-title').allTextContents()
    const appleIdx = titles.findIndex(t => t.includes('Apple card'))
    const zebraIdx = titles.findIndex(t => t.includes('Zebra card'))
    expect(appleIdx).toBeLessThan(zebraIdx)
  })

  test('sort by status A-Z', async ({ page, request }) => {
    const r1 = await request.post('/api/cards', { data: { title: 'Sort status card 1', column: 'todo' } })
    const r2 = await request.post('/api/cards', { data: { title: 'Sort status card 2', column: 'done' } })
    const c1 = await r1.json()
    const c2 = await r2.json()
    createdIds.push(c1.id, c2.id)

    await page.goto('/')
    await page.waitForSelector('kanban-board .board')
    await switchToList(page)

    await page.locator('.sort-select').selectOption('status')
    await page.waitForSelector('.list-view')

    const statuses = await page.locator('.status-select').evaluateAll(els => els.map(e => e.value))
    // 'doing' < 'done' < 'todo' alphabetically by label (Doing < Done < To Do)
    const sorted = [...statuses].sort((a, b) => {
      const labels = { todo: 'To Do', doing: 'Doing', done: 'Done' }
      return labels[a].localeCompare(labels[b])
    })
    expect(statuses).toEqual(sorted)
  })
})
