import { openDB } from 'idb'
import { supabase } from '../access/client'

export interface Stock {
  location_id: string
  sku_id: string
  channel: 'counter' | 'van'
  label: string
  remaining: number
  price: number
}

export async function loadStock(org: string, user: string): Promise<Stock[]> {
  const database = await openDB('dipo-catalog', 1, {
    upgrade(db) { db.createObjectStore('stock') },
  })
  const key = [org, user]
  try {
    if (navigator.onLine && supabase) {
      const { data, error } = await supabase.from('selling_stock')
        .select('location_id,sku_id,channel,label,remaining,price')
        .eq('organization_id', org).eq('user_id', user)
      if (!error) {
        await database.put('stock', data, key)
        return data
      }
    }
    return (await database.get('stock', key)) ?? []
  } finally {
    database.close()
  }
}
