'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../access/client'
import { AdminConsole } from './console'
import { PlatformRecords, type RecordRow } from './platform-records'

const sections = {
  organizations: 'Distributors',
  users: 'User accounts',
  memberships: 'Staff roles',
  stock: 'Stock allocations',
  sales: 'Recorded sales',
  admins: 'Platform admins',
} as const

type Section = keyof typeof sections

export function PlatformDashboard() {
  const [section, setSection] = useState<Section | 'manage'>('organizations')
  const [demo, setDemo] = useState(false)
  const [page, setPage] = useState(0)
  const [counts, setCounts] = useState<Partial<Record<Section, number>>>({})
  const [records, setRecords] = useState<RecordRow[]>([])
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    if (!supabase || section === 'manage') return
    let active = true
    const args = { demo }
    void Promise.all([
      supabase.rpc('platform_dashboard', { ...args, section: 'overview' }),
      supabase.rpc('platform_dashboard', { ...args, section, page_number: page }),
    ]).then(([overview, list]) => {
      if (!active) return
      const error = overview.error ?? list.error
      if (error) {
        setStatus(error.message)
        setRecords([])
      } else {
        setCounts(overview.data)
        setRecords(list.data)
        setStatus('')
      }
      setLoading(false)
    }, () => {
      if (!active) return
      setStatus('Could not load platform data. Try refreshing.')
      setLoading(false)
    })
    return () => { active = false }
  }, [demo, section, page, refresh])

  function navigate(next: Section | 'manage') {
    if (next === section && page === 0) return
    setPage(0)
    setStatus('')
    setLoading(true)
    setSection(next)
  }

  return <div className="platform">
    <div className="platform-toolbar">
      <div><h2>Platform overview</h2><p>{demo ? 'Sample data for exploring the dashboard' : 'Live data across every distributor'}</p></div>
      <label>Data source<select value={demo ? 'demo' : 'live'} onChange={event => {
        setCounts({})
        setLoading(true)
        setPage(0)
        setStatus('')
        setDemo(event.target.value === 'demo')
        if (section === 'manage') setSection('organizations')
      }}>
        <option value="live">Live platform</option><option value="demo">Demo data</option>
      </select></label>
    </div>
    <nav aria-label="Platform sections" className="platform-metrics">
      {(Object.keys(sections) as Section[]).map(key => <button type="button" key={key}
        aria-pressed={section === key} onClick={() => navigate(key)}>
        <strong>{counts[key] ?? '—'}</strong><span>{sections[key]}</span>
      </button>)}
    </nav>
    <div className="platform-toolbar">
      <h2>{section === 'manage' ? 'Manage distributors and staff' : sections[section]}</h2>
      {!demo && <button type="button" aria-pressed={section === 'manage'} onClick={() => navigate('manage')}>Manage access</button>}
      {section !== 'manage' && <button type="button" onClick={() => {
        setLoading(true)
        setRefresh(value => value + 1)
      }}>Refresh</button>}
    </div>
    {section === 'manage' && !demo ? <AdminConsole platform /> :
      loading ? <p role="status">Loading platform data…</p> :
      status ? <p role="alert">{status}</p> :
      records.length ? <PlatformRecords records={records} /> : <p>No records on this page.</p>}
    {section !== 'manage' && !demo && !loading && !status && <div className="platform-toolbar">
      <button disabled={page === 0} onClick={() => { setLoading(true); setPage(page - 1) }}>Previous</button>
      <span>Page {page + 1}</span>
      <button disabled={records.length < 25} onClick={() => { setLoading(true); setPage(page + 1) }}>Next</button>
    </div>}
  </div>
}
