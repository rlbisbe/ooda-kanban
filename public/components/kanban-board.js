import './kanban-card.js'

const COLUMNS = [
  { id: 'todo',  label: 'To Do' },
  { id: 'doing', label: 'Doing' },
  { id: 'done',  label: 'Done' },
]

class KanbanBoard extends HTMLElement {
  #cards = []

  async connectedCallback() {
    this.innerHTML = `<div class="loading">Loading...</div>`
    await this.#fetchCards()
    this.#render()
    this.#bindEvents()
  }

  async #fetchCards() {
    const res = await fetch('/api/cards')
    this.#cards = await res.json()
  }

  #render() {
    this.innerHTML = `
      <div class="board">
        ${COLUMNS.map(col => this.#renderColumn(col)).join('')}
      </div>
    `
  }

  #renderColumn({ id, label }) {
    const cards = this.#cards.filter(c => c.column === id)
    return `
      <div class="column" data-column="${id}">
        <div class="column-header">
          <span class="column-title">${label}</span>
          <span class="column-count">${cards.length}</span>
        </div>
        <div class="column-cards">
          ${cards.map(card => `
            <kanban-card
              card-id="${card.id}"
              title="${escapeAttr(card.title)}"
              column="${card.column}">
            </kanban-card>
          `).join('')}
        </div>
        <div class="add-card-form" style="display:none">
          <input type="text" placeholder="Card title..." maxlength="120">
        </div>
        <button class="add-card-btn" data-column="${id}">+ Add card</button>
      </div>
    `
  }

  #bindEvents() {
    this.addEventListener('card-move', async (e) => {
      const { id, column } = e.detail
      await fetch(`/api/cards/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ column }),
      })
      this.#cards = this.#cards.map(c => c.id === id ? { ...c, column } : c)
      this.#render()
      this.#bindEvents()
    })

    this.addEventListener('card-update', async (e) => {
      const { id, title } = e.detail
      await fetch(`/api/cards/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      })
      this.#cards = this.#cards.map(c => c.id === id ? { ...c, title } : c)
      this.#render()
      this.#bindEvents()
    })

    this.addEventListener('card-delete', async (e) => {
      const { id } = e.detail
      await fetch(`/api/cards/${id}`, { method: 'DELETE' })
      this.#cards = this.#cards.filter(c => c.id !== id)
      this.#render()
      this.#bindEvents()
    })

    this.querySelectorAll('.column').forEach(col => {
      col.addEventListener('dragover', (e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        col.classList.add('drag-over')
      })

      col.addEventListener('dragleave', (e) => {
        if (!col.contains(e.relatedTarget)) {
          col.classList.remove('drag-over')
        }
      })

      col.addEventListener('drop', (e) => {
        e.preventDefault()
        col.classList.remove('drag-over')
        const cardId = e.dataTransfer.getData('text/plain')
        const targetColumn = col.dataset.column
        const card = this.#cards.find(c => c.id === cardId)
        if (card && card.column !== targetColumn) {
          this.dispatchEvent(new CustomEvent('card-move', {
            detail: { id: cardId, column: targetColumn }
          }))
        }
      })
    })

    this.querySelectorAll('.add-card-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const column = btn.closest('.column')
        const form = column.querySelector('.add-card-form')
        btn.style.display = 'none'
        form.style.display = 'block'
        const input = form.querySelector('input')
        input.focus()
        input.addEventListener('keydown', async (e) => {
          if (e.key === 'Enter' && input.value.trim()) {
            await this.#addCard(input.value.trim(), btn.dataset.column)
          } else if (e.key === 'Escape') {
            this.#render()
            this.#bindEvents()
          }
        })
      })
    })
  }

  async #addCard(title, column) {
    const res = await fetch('/api/cards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, column }),
    })
    const card = await res.json()
    this.#cards.push(card)
    this.#render()
    this.#bindEvents()
  }
}

function escapeAttr(str) {
  return String(str).replace(/"/g, '&quot;')
}

customElements.define('kanban-board', KanbanBoard)
