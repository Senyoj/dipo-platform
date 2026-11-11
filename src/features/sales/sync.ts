import { supabase } from '../access/client'
import { acknowledgeSale, pendingSales } from '../sync/outbox'

export async function syncSales(organizationId: string, userId: string) {
  if (!supabase || !navigator.onLine) return

  for (const sale of await pendingSales(organizationId, userId)) {
    const { data, error } = await supabase.rpc('post_sale', { event: sale })
    if (error || data !== sale.id) {
      throw new Error(error?.message ?? 'Sale acknowledgement missing')
    }

    await acknowledgeSale(sale)
  }
}
