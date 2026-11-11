import { openDB, type DBSchema } from 'idb'

export interface SaleEvent {
  id: string
  organizationId: string
  userId: string
  deviceId: string
  stockLocationId: string
  outletId: string | null
  channel: 'counter' | 'van'
  recordedAt: string
  lines: { skuId: string; quantity: number; unitPricePesewas: number }[]
}

interface OutboxSchema extends DBSchema {
  sales: {
    key: string
    value: SaleEvent
    indexes: { owner: [string, string] }
  }
}

function openOutbox() {
  return openDB<OutboxSchema>('dipo-outbox', 1, {
    upgrade(database) {
      const sales = database.createObjectStore('sales', { keyPath: 'id' })
      sales.createIndex('owner', ['organizationId', 'userId'])
    },
  })
}

export async function enqueueSale(sale: SaleEvent) {
  const database = await openOutbox()
  try {
    await database.add('sales', sale)
  } finally {
    database.close()
  }
}

export async function pendingSales(organizationId: string, userId: string) {
  const database = await openOutbox()
  try {
    const sales = await database.getAllFromIndex('sales', 'owner', [organizationId, userId])
    return sales.sort((a, b) => a.recordedAt.localeCompare(b.recordedAt))
  } finally {
    database.close()
  }
}

export async function acknowledgeSale(sale: SaleEvent) {
  const database = await openOutbox()
  try {
    const transaction = database.transaction('sales', 'readwrite')
    const stored = await transaction.store.get(sale.id)
    if (stored?.organizationId === sale.organizationId && stored.userId === sale.userId) {
      await transaction.store.delete(sale.id)
    }
    await transaction.done
  } finally {
    database.close()
  }
}
