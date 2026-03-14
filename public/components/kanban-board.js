import './kanban-card.js'

const COLUMNS = [
  { id: 'todo',  label: 'To Do' },
  { id: 'doing', label: 'Doing' },
  { id: 'done',  label: 'Done' },
]

const COLUMN_LABELS = Object.fromEntries(COLUMNS.map(c => [c.id, c.label]))

const SORT_OPTIONS = [
  { value: 'updatedAt', label: 'Last updated' },
  { value: 'title',     label: 'Title (A–Z)' },
  { value: 'status',    label: 'Status (A–Z)' },
]

class KanbanBoard extends HTMLElement {
  #cards = []
  #view = 'kanban'   // 'kanban' | 'list'
  #sortBy = 'updatedAt'

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

  // ── Sorting ───────────────────────────────────────────────────────────────

  #sortedCards() {
    const cards = [...this.#cards]
    if (this.#sortBy === 'title') {
      cards.sort((a, b) => a.title.localeCompare(b.title))
    } else if (this.#sortBy === 'status') {
      cards.sort((a, b) => {
        const la = COLUMN_LABELS[a.column] ?? a.column
        const lb = COLUMN_LABELS[b.column] ?? b.column
        return la.localeCompare(lb)
      })
    } else {
      // updatedAt: newest first; fall back to id for cards without updatedAt
      cards.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
    }
    return cards
  }

  // ── Render ────────────────────────────────────────────────────────────────

  #render() {
    const toolbar = this.#renderToolbar()
    const content = this.#view === 'list'
      ? this.#renderList()
      : this.#renderBoard()

    this.innerHTML = `${toolbar}${content}`

    // Imperatively set select values so happy-dom (and older browsers) pick them up
    if (this.#view === 'list') {
      this.querySelectorAll('.status-select').forEach(sel => {
        sel.value = sel.dataset.value
      })
    }
  }

  #renderToolbar() {
    const sortSelect = SORT_OPTIONS.map(o =>
      `<option value="${o.value}" ${this.#sortBy === o.value ? 'selected' : ''}>${o.label}</option>`
    ).join('')

    return `
      <div class="board-toolbar">
        <div class="view-toggle">
          <button class="view-btn ${this.#view === 'kanban' ? 'active' : ''}" data-view="kanban" title="Kanban view">
            <span class="view-icon">&#9638;</span> Board
          </button>
          <button class="view-btn ${this.#view === 'list' ? 'active' : ''}" data-view="list" title="List view">
            <span class="view-icon">&#9776;</span> List
          </button>
        </div>
        ${this.#view === 'list' ? `
        <div class="sort-control">
          <label for="sort-select">Sort by</label>
          <select id="sort-select" class="sort-select">
            ${sortSelect}
          </select>
        </div>` : ''}
      </div>
    `
  }

  #renderBoard() {
    return `
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

  #renderList() {
    const cards = this.#sortedCards()
    const columnOptions = COLUMNS.map(col =>
      `<option value="${col.id}">{col.label}</option>`
    ).join('')
    const rows = cards.map(card => {
      const options = COLUMNS.map(col =>
        `<option value="${col.id}" ${card.column === col.id ? 'selected' : ''}>${col.label}</option>`
      ).join('')
      return `
        <tr class="list-row" data-id="${card.id}">
          <td class="list-title">
            <span class="list-card-title" data-id="${card.id}">${escapeHtml(card.title)}</span>
          </td>
          <td class="list-status">
            <select class="status-select" data-id="${card.id}" data-value="${card.column}">
              ${options}
            </select>
          </td>
          <td class="list-actions">
            <button class="btn btn-delete list-delete-btn" data-id="${card.id}" title="Delete">&#x2715;</button>
          </td>
        </tr>
      `
    }).join('')

    return `
      <div class="list-view">
        <table class="list-table">
          <thead>
            <tr>
              <th class="list-th-title">Title</th>
              <th class="list-th-status">Status</th>
              <th class="list-th-actions"></th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
        <div class="list-add-row">
          <input type="text" class="list-add-input" placeholder="Add a card..." maxlength="120">
          <select class="list-add-status">
            ${COLUMNS.map(col => `<option value="${col.id}">${col.label}</option>`).join('')}
          </select>
          <button class="list-add-btn">Add</button>
        </div>
      </div>
    `
  }

  // ── Events ────────────────────────────────────────────────────────────────

  #bindEvents() {
    // View toggle
    this.querySelectorAll('.view-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.#view = btn.dataset.view
        this.#render()
        this.#bindEvents()
      })
    })

    if (this.#view === 'list') {
      this.#bindListEvents()
    } else {
      this.#bindBoardEvents()
    }
  }

  #bindListEvents() {
    // Sort select
    const sortSel = this.querySelector('.sort-select')
    if (sortSel) {
      sortSel.addEventListener('change', () => {
        this.#sortBy = sortSel.value
        this.#render()
        this.#bindEvents()
      })
    }

    // Status dropdowns
    this.querySelectorAll('.status-select').forEach(sel => {
      sel.addEventListener('change', async () => {
        const id = sel.dataset.id
        const column = sel.value
        await fetch(`/api/cards/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ column }),
        })
        this.#cards = this.#cards.map(c => c.id === id ? { ...c, column, updatedAt: Date.now() } : c)
        this.#render()
        this.#bindEvents()
      })
    })

    // Inline title edit (click to edit)
    this.querySelectorAll('.list-card-title').forEach(span => {
      span.addEventListener('click', () => this.#startListEdit(span))
    })

    // Delete buttons
    this.querySelectorAll('.list-delete-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id
        await fetch(`/api/cards/${id}`, { method: 'DELETE' })
        this.#cards = this.#cards.filter(c => c.id !== id)
        this.#render()
        this.#bindEvents()
      })
    })

    // Add row
    const addBtn = this.querySelector('.list-add-btn')
    const addInput = this.querySelector('.list-add-input')
    const addStatus = this.querySelector('.list-add-status')

    if (addBtn && addInput) {
      const doAdd = async () => {
        const title = addInput.value.trim()
        if (!title) return
        await this.#addCard(title, addStatus?.value ?? 'todo')
      }

      addBtn.addEventListener('click', doAdd)
      addInput.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter') await doAdd()
      })
    }
  }

  #startListEdit(span) {
    const id = span.dataset.id
    const originalTitle = span.textContent

    const input = this.ownerDocument.createElement('input')
    input.type = 'text'
    input.value = originalTitle
    input.className = 'card-title-input list-title-input'
    span.replaceWith(input)
    input.focus()
    input.select()

    let done = false

    const save = async () => {
      if (done) return
      done = true
      const newTitle = input.value.trim()
      if (newTitle && newTitle !== originalTitle) {
        await fetch(`/api/cards/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: newTitle }),
        })
        this.#cards = this.#cards.map(c => c.id === id ? { ...c, title: newTitle, updatedAt: Date.now() } : c)
      }
      this.#render()
      this.#bindEvents()
    }

    const cancel = () => {
      if (done) return
      done = true
      this.#render()
      this.#bindEvents()
    }

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') save()
      if (e.key === 'Escape') cancel()
    })
    input.addEventListener('blur', save)
  }

  #bindBoardEvents() {
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

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

customElements.define('kanban-board', KanbanBoard)
