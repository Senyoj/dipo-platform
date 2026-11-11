'use client'

import { useEffect, useState } from 'react'
import { supabase } from './client'
import { SignIn } from './sign-in'
import { Register } from '../sales/register'
import { AdminConsole } from '../admin/console'
import { PlatformDashboard } from '../admin/platform'
import { roles as roleLabels } from '../admin/roles'

interface Access {
  user: string
  memberships: { organization_id: string; role: string }[]
  admin: boolean
}

export function Workspace({ administration = false }: { administration?: boolean }) {
  const [access, setAccess] = useState<Access | null>(null)
  const [ready, setReady] = useState(false)
  const [organization, setOrganization] = useState('')

  useEffect(() => {
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      void navigator.serviceWorker.register('/sw.js').catch(() => undefined)
    }
  }, [])

  useEffect(() => {
    const client = supabase
    if (!client) return
    let revision = 0
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      const current = ++revision
      window.setTimeout(async () => {
        if (current !== revision) return
        if (!session) {
          setAccess(null)
          setReady(true)
          return
        }
        const user = session.user.id
        const key = `dipo-access-${user}`
        const [members, admin] = await Promise.all([
          client.from('memberships').select('organization_id,role').eq('user_id', user),
          client.from('platform_admins').select('user_id').eq('user_id', user),
        ])
        if (current !== revision) return
        let result: Access = { user, memberships: [], admin: false }
        if (!members.error && !admin.error) {
          result = { user, memberships: members.data, admin: admin.data.length > 0 }
          try { localStorage.setItem(key, JSON.stringify({ ...result, admin: false })) } catch {}
        } else if (!navigator.onLine) {
          try {
            const cached = localStorage.getItem(key)
            if (cached) result = JSON.parse(cached)
          } catch {}
        }
        setAccess(result)
        setOrganization(previous => result.memberships.some(row => row.organization_id === previous)
          ? previous : (result.memberships[0]?.organization_id ?? ''))
        setReady(true)
      }, 0)
    })
    return () => { revision++; subscription.unsubscribe() }
  }, [])

  if (!supabase) return <p>Set the public Supabase configuration to enable sign-in.</p>
  if (!ready) return <p role="status">Checking access…</p>
  if (!access) return <SignIn />

  const roles = access.memberships.filter(row => row.organization_id === organization).map(row => row.role)
  const organizations = [...new Set(access.memberships.map(row => row.organization_id))]
  const canManage = access.admin || access.memberships.some(row => row.role === 'owner')

  if (administration) {
    if (access.admin) return <PlatformDashboard />
    if (canManage) return <AdminConsole platform={false} />
    return <p>Distributor owner or platform superadmin access is required.</p>
  }

  const canSell = roles.some(role => ['owner', 'operations_manager', 'sales', 'cashier', 'driver'].includes(role))

  return (
    <div className="operation">
      {access.admin && <p>Platform superadmin</p>}
      {canManage && <a className="primary-link" href="/admin">Open administration</a>}
      {organizations.length > 0 && <label>Organization<select value={organization}
        onChange={event => setOrganization(event.target.value)}>
        {organizations.map(id => <option key={id}>{id}</option>)}
      </select></label>}
      <p>{roles.length ? roles.map(role => roleLabels[role as keyof typeof roleLabels] ?? role).join(', ') : 'No distributor role assigned.'}</p>
      <button onClick={() => void supabase?.auth.signOut({ scope: 'local' })}>Sign out</button>
      {canSell && <Register key={`${access.user}-${organization}`} org={organization} user={access.user} />}
    </div>
  )
}
