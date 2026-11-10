'use client'

import { useEffect, useRef } from 'react'
import { ensureN8nChatStylesheet, loadN8nChat, watchForChatWindow } from '@/lib/embeddedChat'

const CHAT_TARGET_SELECTOR = '#lead-assistant-chat'

interface LeadAssistantChatWidgetProps {
  webhookUrl: string
}

/** Loads @n8n/chat from the CDN and mounts it into the page's #lead-assistant-chat element (route-scoped, no npm install). */
export default function LeadAssistantChatWidget({ webhookUrl }: LeadAssistantChatWidgetProps) {
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
          'Welcome to the AskMe Analytics AI Lead Assistant demo!',
          'Tell me what you’re looking for — a product, a service, or general information. I can collect the details for a sample inquiry.',
        ],
        i18n: {
          en: {
            title: 'AI Lead Assistant Demo',
            subtitle: 'Explore AI-powered inquiry capture and qualification.',
            footer: '',
            getStarted: 'Start chat',
            inputPlaceholder: 'Tell me what you’re looking for…',
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

  // The page renders #lead-assistant-chat; it unmounts (taking the widget and resize handle with it) when the route changes
  return null
}
