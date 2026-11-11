import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import './workspace.css'

export const metadata: Metadata = { title: 'Dipo', description: 'Distribution operations' }

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en"><body>{children}</body></html>
}
