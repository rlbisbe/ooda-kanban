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
      <div class="card">
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
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

customElements.define('kanban-card', KanbanCard)
