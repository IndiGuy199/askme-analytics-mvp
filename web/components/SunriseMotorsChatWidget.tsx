'use client'

import { useEffect, useRef } from 'react'

const CHAT_CSS_URL = 'https://cdn.jsdelivr.net/npm/@n8n/chat/dist/style.css'
const CHAT_JS_URL = 'https://cdn.jsdelivr.net/npm/@n8n/chat/dist/chat.bundle.es.js'
const CHAT_TARGET_SELECTOR = '#sunrise-chat'

interface SunriseMotorsChatWidgetProps {
  webhookUrl: string
}

/** Loads @n8n/chat from the CDN and mounts it into the page's #sunrise-chat element (route-scoped, no npm install). */
export default function SunriseMotorsChatWidget({ webhookUrl }: SunriseMotorsChatWidgetProps) {
  const initialized = useRef(false)

  useEffect(() => {
    // Guard against double-invocation from React Strict Mode / fast refresh
    if (initialized.current) return
    initialized.current = true

    if (!document.querySelector('link[data-n8n-chat-style]')) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = CHAT_CSS_URL
      link.setAttribute('data-n8n-chat-style', 'true')
      document.head.appendChild(link)
    }

    let cancelled = false
    // webpackIgnore: resolve this import against the CDN at runtime instead of bundling it
    import(/* webpackIgnore: true */ CHAT_JS_URL).then(({ createChat }) => {
      if (cancelled) return
      createChat({
        webhookUrl,
        target: CHAT_TARGET_SELECTOR,
        mode: 'window',
        loadPreviousSession: false,
        initialMessages: [
          'Welcome to the Sunrise Motors demo!',
          'Try asking: “Do you have any available Hondas?”',
        ],
        i18n: {
          en: {
            title: 'Sunrise Motors Demo',
            subtitle: 'Explore sample inventory and try a sales inquiry.',
            footer: '',
            getStarted: 'Start chat',
            inputPlaceholder: 'Ask about a vehicle…',
          },
        },
      })
    })

    return () => {
      cancelled = true
    }
  }, [webhookUrl])

  // The page renders #sunrise-chat; it unmounts (taking the widget with it) when the route changes
  return null
}
