import './globals.css'
import { Inter } from 'next/font/google'
import Footer from '@/components/Footer'
import Script from 'next/script'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'AskMe Analytics - AI-Powered Analytics Dashboard',
  description: 'Transform your data into actionable insights with AI-powered analytics',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
             
        {/* AskMe Analytics Initialization */}
        <Script id="askme-analytics-config" strategy="beforeInteractive">
          {`
            window.AskMeAnalyticsConfig = {
              // Required: PostHog credentials
              apiKey: 'phc_MN5MXCec7lNZtZakqpRQZqTLaPfcV6CxeE8hfbTUFE2',
              apiHost: 'https://us.i.posthog.com',
              
              // Client-specific identifier (override per client)
              clientId: 'askme-analytics-app',
              
              // Debug mode (set to false in production)
              debug: true
              
              // Library paths are optional - defaults are set in askme-analytics-init.js
              // Only override if you host the files at a different location
            };
          `}
        </Script>

        <Script 
          src="/lib/clientAnalytics/askme-analytics-init.js" 
          strategy="afterInteractive"
        />
      </head>
      <body className={inter.className}>
        <div className="flex flex-col min-h-screen">
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  )
}
