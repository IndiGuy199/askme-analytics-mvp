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
          {`window.AskMeAnalyticsConfig = { clientId: 'askme-analytics-app', analyticsLibraryPath: '/lib/clientAnalytics/ask-me-analytics.min.js', constantsPath: '/lib/clientAnalytics/ph-constants.min.js', injectorPath: '/lib/clientAnalytics/ph-product-injector.min.js' };`}
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
