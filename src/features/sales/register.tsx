import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { enqueueSale, pendingSales } from '../sync/outbox'
import { loadStock, type Stock } from './catalog'
import { syncSales } from './sync'

const currency = new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS' })

export function Register({ org, user }: { org: string; user: string }) {
  const [stock, setStock] = useState<Stock[]>([])
  const [pending, setPending] = useState(0)
  const [message, setMessage] = useState('')
  const busy = useRef(false)
  const [working, setWorking] = useState(false)

  const refresh = useCallback(async () => {
    setStock(await loadStock(org, user))
    setPending((await pendingSales(org, user)).length)
  }, [org, user])

  const flush = useCallback(async () => {
    if (busy.current) return
    busy.current = true
    setWorking(true)
    try {
      await syncSales(org, user)
      await refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Sync unavailable')
      await refresh().catch(() => undefined)
    } finally {
      busy.current = false
      setWorking(false)
    }
  }, [org, user, refresh])

  useEffect(() => {
    const start = () => { void flush() }
    start()
    window.addEventListener('online', start)
    window.addEventListener('focus', start)
    return () => {
      window.removeEventListener('online', start)
      window.removeEventListener('focus', start)
    }
  }, [flush])

  async function record(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy.current) return
    const values = new FormData(event.currentTarget)
    const item = stock[Number(values.get('item'))]
    const quantity = Number(values.get('quantity'))
    if (!item || !Number.isInteger(quantity) || quantity < 1) return
    busy.current = true
    setWorking(true)
    try {
      await navigator.locks.request(`dipo-sale-${org}-${user}`, async () => {
        const latest = await loadStock(org, user)
        const current = latest.find(row => row.location_id === item.location_id
          && row.sku_id === item.sku_id && row.channel === item.channel)
        const queued = await pendingSales(org, user)
        const reserved = queued.filter(sale => sale.stockLocationId === item.location_id && sale.channel === item.channel)
          .flatMap(sale => sale.lines).filter(line => line.skuId === item.sku_id)
          .reduce((total, line) => total + line.quantity, 0)
        if (!current || current.price !== item.price || quantity > current.remaining - reserved) {
          throw new Error('Insufficient allocated stock or the price changed.')
        }
        const deviceId = localStorage.getItem('dipo-device') ?? crypto.randomUUID()
        localStorage.setItem('dipo-device', deviceId)
        await enqueueSale({
          id: crypto.randomUUID(), organizationId: org, userId: user, deviceId,
          stockLocationId: item.location_id, outletId: null, channel: item.channel,
          recordedAt: new Date().toISOString(),
          lines: [{ skuId: item.sku_id, quantity, unitPricePesewas: item.price }],
        })
        setPending(queued.length + 1)
        setMessage('Sale saved on this device.')
      })
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save the sale.')
      return
    } finally {
      busy.current = false
      setWorking(false)
    }
    await flush()
  }

  return (
    <section className="operation">
      <h2>Record a sale</h2>
      <p role="status">{pending} pending sync {message && `· ${message}`}</p>
      {stock.length ? (
        <form className="operation" onSubmit={record}>
          <label>Product<select name="item" required>
            {stock.map((item, index) => (
              <option key={`${item.location_id}-${item.sku_id}-${item.channel}`} value={index}>
                {item.label} · {item.channel} · {currency.format(item.price / 100)}
              </option>
            ))}
          </select></label>
          <label>Quantity<input name="quantity" type="number" min="1" step="1" defaultValue="1" required /></label>
          <button disabled={working}>Save sale</button>
        </form>
      ) : <p>No selling stock assigned. Connect once after stock has been allocated.</p>}
      <button disabled={working || pending === 0} onClick={() => void flush()}>Sync pending sales</button>
    </section>
  )
}
