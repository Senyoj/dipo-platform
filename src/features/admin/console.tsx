'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../access/client'
import { Staff, type StaffRole } from './staff'

interface Organization { id: string; name: string }

export function AdminConsole({ platform }: { platform: boolean }) {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [org, setOrg] = useState('')
  const [staff, setStaff] = useState<StaffRole[]>([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let active = true
    void supabase?.rpc('manage_distributor', { action: 'organizations' }).then(({ data, error }) => {
      if (!active) return
      if (error) setMessage(error.message)
      else {
        setOrganizations(data)
        setOrg(data[0]?.id ?? '')
      }
    })
    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true
    if (org) void supabase?.rpc('manage_distributor', { action: 'staff', org }).then(({ data, error }) => {
      if (!active) return
      if (error) setMessage(error.message)
      else setStaff(data)
    })
    return () => { active = false }
  }, [org])

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase || busy) return
    const label = String(new FormData(event.currentTarget).get('name')).trim()
    if (!label) return
    setBusy(true)
    try {
      const { data, error } = await supabase.rpc('manage_distributor', { action: 'create', label })
      if (error) throw error
      setOrganizations(previous => [...previous, { id: data.id, name: label }])
      setStaff([])
      setOrg(data.id)
      setMessage('Distributor created.')
    } catch (error) {
      setMessage((error as { message: string }).message)
    } finally {
      setBusy(false)
    }
  }

  async function change(action: 'assign' | 'remove', email: string, role: string) {
    if (!supabase || busy || !org) return
    setBusy(true)
    try {
      const mutation = await supabase.rpc('manage_distributor', { action, org, staff_email: email, staff_role: role })
      if (mutation.error) throw mutation.error
      const result = await supabase.rpc('manage_distributor', { action: 'staff', org })
      if (result.error) throw result.error
      setStaff(result.data)
      setMessage(action === 'assign' ? 'Role assigned.' : 'Role removed.')
    } catch (error) {
      setMessage((error as { message: string }).message)
    } finally {
      setBusy(false)
    }
  }

  return <>
    <p role="status">{message}</p>
    <div className="admin-grid">
      <section className="panel">
        <h2>Distributors</h2>
        <div className="operation">
          {organizations.length > 0 && <label>Choose a distributor
            <select value={org} disabled={busy} onChange={event => {
              setStaff([])
              setOrg(event.target.value)
            }}>{organizations.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select>
          </label>}
        </div>
        {platform && <form className="operation" onSubmit={create}>
          <label>New distributor name<input name="name" maxLength={150} required /></label>
          <button disabled={busy}>Create distributor</button>
        </form>}
      </section>
      {org && <Staff staff={staff} platform={platform} busy={busy} change={change} />}
    </div>
  </>
}
