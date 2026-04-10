/**
 * Standardizes how the application determines its absolute base URL.
 * Works on both client and server side.
 */
export const getURL = () => {
  let url =
    process?.env?.NEXT_PUBLIC_SITE_URL ?? // Set this to http://localhost:3000 in .env.local
    process?.env?.NEXT_PUBLIC_VERCEL_URL ?? // Automatically set on Vercel
    'http://localhost:3000/'
  
  // Make sure to include `https://` when not localhost.
  url = url.includes('http') ? url : `https://${url}`
  
  // Make sure to include a trailing `/`.
  url = url.endsWith('/') ? url : `${url}/`
  
  return url
}
