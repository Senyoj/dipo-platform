import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Dipo Distribution',
    short_name: 'Dipo',
    start_url: '/',
    display: 'standalone',
    background_color: '#edf3ef',
    theme_color: '#194d38',
    icons: [{ src: '/dipo.svg', sizes: 'any', type: 'image/svg+xml' }],
  }
}
