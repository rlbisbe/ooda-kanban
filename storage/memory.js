const SEED = [
  { id: '1', title: 'Observe the situation', column: 'done' },
  { id: '2', title: 'Orient and assess options', column: 'doing' },
  { id: '3', title: 'Decide on next action', column: 'todo' },
]

export function createMemoryStorage(initialCards = SEED) {
  let cards = initialCards.map(c => ({ ...c }))

  return {
    async list() {
      return [...cards]
    },

    async create(card) {
      cards.push(card)
      return card
    },

    async update(id, updates) {
      const idx = cards.findIndex(c => c.id === id)
      if (idx === -1) return null
      cards[idx] = { ...cards[idx], ...updates }
      return cards[idx]
    },

    async delete(id) {
      cards = cards.filter(c => c.id !== id)
    },
  }
}
