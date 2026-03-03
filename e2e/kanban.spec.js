import { test, expect } from '@playwright/test'

async function reloadBoard(page) {
  await page.reload()
  await page.waitForSelector('kanban-board .board')
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
