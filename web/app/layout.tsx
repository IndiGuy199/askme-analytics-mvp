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
        {/* AskMe Analytics Configuration */}
        <Script id="askme-analytics-config" strategy="beforeInteractive">
          {`
            window.AskMeAnalyticsConfig = {
              clientId: 'askme-analytics-app',
              analyticsLibraryPath: '/lib/clientAnalytics/ask-me-analytics.js',
              constantsPath: '/lib/clientAnalytics/ph-constants.js',
              injectorPath: '/lib/clientAnalytics/ph-product-injector.js',
              
              // Product tracking for pricing page
              productConfig: {
                eventName: 'subscription_click',
                pageMatch: '/pricing',
                panelClass: 'rounded-lg',
                titleClass: 'text-xl',
                priceClass: 'text-4xl',
                currencyClass: 'text-gray-600'
              },
              
              // Funnel steps for signup and checkout
              steps: [
                {"key":"SIGNUP_CTA_CLICKED","url":"/","urlMatch":"contains","selector":"a[href='/login']"},
                {"key":"ONBOARDING_STARTED","url":"/onboarding/company","urlMatch":"contains"},
                {"key":"ONBOARDING_STEP1_COMPLETED","url":"/onboarding/company","urlMatch":"contains","selector":"button[type='submit']"},
                {"key":"ONBOARDING_STEP2_COMPLETED","url":"/onboarding/posthog","urlMatch":"contains","selector":"button[type='submit']"},
                {"key":"SIGNUP_COMPLETED","url":"/dashboard","urlMatch":"contains"},
                {"key":"CHECKOUT_VIEWED","url":"/pricing","urlMatch":"contains"},
                {"key":"CHECKOUT_COMPLETED","url":"/dashboard","urlMatch":"contains","selector":"[data-subscription-status='active']","requireSelectorPresent":true}
              ]
            };
          `}
        </Script>
        
        {/* AskMe Analytics Initialization */}
        <Script 
          src="https://askmeanalytics.com/lib/clientAnalytics/askme-analytics-init.js" 
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
