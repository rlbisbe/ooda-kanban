const COLUMNS = ['todo', 'doing', 'done']

class KanbanCard extends HTMLElement {
  static get observedAttributes() {
    return ['card-id', 'title', 'column']
  }

  connectedCallback() {
    this.render()
  }

  attributeChangedCallback() {
    this.render()
  }

  get cardId() { return this.getAttribute('card-id') }
  get title() { return this.getAttribute('title') }
  get column() { return this.getAttribute('column') }

  render() {
    const colIndex = COLUMNS.indexOf(this.column)

    this.innerHTML = `
      <div class="card" draggable="true" title="Click to edit">
        <div class="card-title">${escapeHtml(this.title)}</div>
        <div class="card-actions">
          <div class="card-move">
            <button class="btn btn-move" data-action="move-left" ${colIndex === 0 ? 'disabled' : ''}>&#8592;</button>
            <button class="btn btn-move" data-action="move-right" ${colIndex === COLUMNS.length - 1 ? 'disabled' : ''}>&#8594;</button>
          </div>
          <button class="btn btn-delete" data-action="delete" title="Delete">&#x2715;</button>
        </div>
      </div>
    `

    const card = this.querySelector('.card')

    card.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', this.cardId)
      e.dataTransfer.effectAllowed = 'move'
      this.classList.add('dragging')
    })

    card.addEventListener('dragend', () => {
      this.classList.remove('dragging')
    })

    this.querySelector('.card-title').addEventListener('click', () => this.#startEdit())

    this.querySelector('[data-action="move-left"]')?.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('card-move', {
        bubbles: true,
        detail: { id: this.cardId, column: COLUMNS[colIndex - 1] }
      }))
    })

    this.querySelector('[data-action="move-right"]')?.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('card-move', {
        bubbles: true,
        detail: { id: this.cardId, column: COLUMNS[colIndex + 1] }
      }))
    })

    this.querySelector('[data-action="delete"]')?.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('card-delete', {
        bubbles: true,
        detail: { id: this.cardId }
      }))
    })
  }

  #startEdit() {
    const titleEl = this.querySelector('.card-title')
    const originalTitle = this.title

    const input = this.ownerDocument.createElement('input')
    input.type = 'text'
    input.value = originalTitle
    input.className = 'card-title-input'
    titleEl.replaceWith(input)
    input.focus()
    input.select()

    let done = false

    const save = () => {
      if (done) return
      done = true
      const newTitle = input.value.trim()
      if (newTitle && newTitle !== originalTitle) {
        this.dispatchEvent(new CustomEvent('card-update', {
          bubbles: true,
          detail: { id: this.cardId, title: newTitle }
        }))
      }
      this.render()
    }

    const cancel = () => {
      if (done) return
      done = true
      this.render()
    }

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') save()
      if (e.key === 'Escape') cancel()
    })
    input.addEventListener('blur', save)
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

customElements.define('kanban-card', KanbanCard)
