export type RecordRow = Record<string, unknown>

const labels: Record<string, string> = {
  id: 'ID', organization: 'Distributor', email: 'Email', role: 'Role',
  name: 'Name', label: 'Product', channel: 'Channel', remaining: 'Units available',
  price: 'Unit price', total: 'Sale total', lines: 'Items', posted_at: 'Posted',
  created_at: 'Created', last_sign_in_at: 'Last sign-in', user_id: 'User ID',
  location_id: 'Location ID', sku_id: 'SKU ID',
}

function display(key: string, value: unknown) {
  if (value == null) return '—'
  if (key === 'total' || key === 'price') {
    return new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS' }).format(Number(value) / 100)
  }
  if (key.endsWith('_at')) return new Date(String(value)).toLocaleString()
  return String(value).replaceAll(key === 'role' ? '_' : '\u0000', ' ')
}

export function PlatformRecords({ records }: { records: RecordRow[] }) {
  return <div className="platform-records">
    {records.map((row, index) => (
      <article className="panel" key={index}>
        <h3>{String(row.name ?? row.label ?? row.email ?? row.id ?? 'Record')}</h3>
        <dl>
          {Object.entries(row).filter(([key]) => key !== 'lines').map(([key, value]) =>
            <div key={key}><dt>{labels[key] ?? key}</dt><dd>{display(key, value)}</dd></div>)}
        </dl>
        {Array.isArray(row.lines) && <details>
          <summary>Sale items ({row.lines.length})</summary>
          <ul>{row.lines.map((line, i) => <li key={i}>
            {String(line.skuId)} · {String(line.quantity)} units · {display('price', line.unitPricePesewas)}
          </li>)}</ul>
        </details>}
      </article>
    ))}
  </div>
}
