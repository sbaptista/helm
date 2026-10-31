import type { MetadataRoute } from 'next'

// Home Screen web app. On iPhone and iPad, Safari clears a site's stored data
// after 7 days without a visit; a Home Screen web app is exempt, which keeps
// the offline copies of trips (docs/offline-editing-plan.md §6).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Helm',
    short_name: 'Helm',
    description: 'Your travel companion',
    start_url: '/advisor/dashboard',
    display: 'standalone',
    background_color: '#0D1E35',
    theme_color: '#0D1E35',
    icons: [
      { src: '/icons/helm-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/helm-512.png', sizes: '512x512', type: 'image/png' },
    ],
  }
}
