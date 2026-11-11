import { areas } from '../features/workspace/areas'

export default function Home() {
  return (
    <main>
      <header><strong>Dipo</strong></header>
      <h1>Distribution workspace</h1>
      <p>Operations modules planned for this workspace.</p>
      <ul className="areas">
        {areas.map(({ name, purpose }) => (
          <li key={name}><h2>{name}</h2><p>{purpose}</p></li>
        ))}
      </ul>
    </main>
  )
}
