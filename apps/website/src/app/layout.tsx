import './globals.css'
import type { ReactNode } from 'react'

// The real <html> layout lives one level down, in `[locale]`, because the
// document language is a route parameter.
export default function RootLayout({ children }: { children: ReactNode }) {
  return children
}
