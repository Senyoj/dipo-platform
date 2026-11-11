import type { FormEvent } from 'react'
import { roles } from './roles'

export interface StaffRole { email: string; role: keyof typeof roles }

export function Staff({ staff, platform, busy, change }: {
  staff: StaffRole[]
  platform: boolean
  busy: boolean
  change: (action: 'assign' | 'remove', email: string, role: string) => Promise<void>
}) {
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const values = new FormData(event.currentTarget)
    await change('assign', String(values.get('email')), String(values.get('role')))
  }

  return <section className="panel">
    <h2>Staff access</h2>
    <form className="operation" onSubmit={submit}>
      <label>Staff email<input name="email" type="email" required /></label>
      <label>Role<select name="role">
        {Object.entries(roles).filter(([role]) => platform || role !== 'owner')
          .map(([role, label]) => <option key={role} value={role}>{label}</option>)}
      </select></label>
      <button disabled={busy}>Assign role</button>
    </form>
    {staff.length === 0 && <p>No staff assigned.</p>}
    <ul className="staff-list">
      {staff.map(({ email, role }) => <li key={`${email}-${role}`}>
        <strong>{email}</strong><span>{roles[role]}</span>
        {(platform || role !== 'owner') && <button disabled={busy} onClick={() => {
          if (window.confirm(`Remove ${roles[role]} access for ${email}?`)) void change('remove', email, role)
        }}>Remove role</button>}
      </li>)}
    </ul>
  </section>
}
