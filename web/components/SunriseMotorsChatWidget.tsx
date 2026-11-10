'use client'

import { useEffect, useRef } from 'react'
import { ensureN8nChatStylesheet, loadN8nChat, watchForChatWindow } from '@/lib/embeddedChat'

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

    ensureN8nChatStylesheet()

    let cancelled = false
    let observer: MutationObserver | null = null

    loadN8nChat().then(({ createChat }) => {
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

      if (cancelled) return
      const container = document.querySelector(CHAT_TARGET_SELECTOR)
      if (container) {
        observer = watchForChatWindow(container, () => cancelled)
      }
    })

    return () => {
      cancelled = true
      observer?.disconnect()
    }
  }, [webhookUrl])

  // The page renders #sunrise-chat; it unmounts (taking the widget and resize handle with it) when the route changes
  return null
}
