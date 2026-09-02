import type { Metadata } from 'next'
import './globals.css'
import { Providers } from '@/components/Providers'
import { Sidebar } from '@/components/Sidebar'
import { StatsHeader } from '@/components/StatsHeader'
import { AiDisabledBanner } from '@/components/AiDisabledBanner'

export const metadata: Metadata = { title: 'English Academy Tutor' }
export const dynamic = 'force-dynamic'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if((localStorage.getItem('theme')||'light')==='dark')document.documentElement.classList.add('dark')}catch(e){}`,
          }}
        />
        <Providers>
          <div className="flex min-h-screen">
            <Sidebar />
            <div className="flex min-w-0 flex-1 flex-col">
              <StatsHeader />
              <AiDisabledBanner />
              <main className="flex-1 p-6">{children}</main>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  )
}
