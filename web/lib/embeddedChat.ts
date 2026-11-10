// Shared loading + resize logic for embedded @n8n/chat widgets used across /demos/* pages.

export const CHAT_CSS_URL = 'https://cdn.jsdelivr.net/npm/@n8n/chat/dist/style.css'
export const CHAT_JS_URL = 'https://cdn.jsdelivr.net/npm/@n8n/chat/dist/chat.bundle.es.js'

type CreateChatModule = { createChat: (options: Record<string, unknown>) => void }

/** Injects the @n8n/chat stylesheet once per page, regardless of how many widgets mount. */
export function ensureN8nChatStylesheet(): void {
  if (document.querySelector('link[data-n8n-chat-style]')) return
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = CHAT_CSS_URL
  link.setAttribute('data-n8n-chat-style', 'true')
  document.head.appendChild(link)
}

/** Loads the @n8n/chat ESM bundle directly from the CDN at runtime (no npm install/bundling). */
export function loadN8nChat(): Promise<CreateChatModule> {
  // webpackIgnore: resolve this import against the CDN at runtime instead of bundling it
  return import(/* webpackIgnore: true */ CHAT_JS_URL)
}

/** Finds the chat window inside `container` and attaches a drag-to-resize handle (idempotent). */
export function attachChatResizeHandle(container: Element): boolean {
  const windowEl = container.querySelector<HTMLElement>('.chat-window')
  if (!windowEl) return false
  if (windowEl.querySelector('.askme-resize-handle')) return true

  const handle = document.createElement('div')
  handle.className = 'askme-resize-handle'
  handle.title = 'Drag to resize chat'
  handle.setAttribute('role', 'separator')
  handle.setAttribute('aria-label', 'Resize chat window')
  windowEl.appendChild(handle)

  const onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0) return
    event.preventDefault()
    handle.setPointerCapture(event.pointerId)

    const startX = event.clientX
    const startY = event.clientY
    const startWidth = windowEl.offsetWidth
    const startHeight = windowEl.offsetHeight
    // Clamp to both the in-page container and the viewport, not a fixed-position corner
    const containerWidth = container.getBoundingClientRect().width

    const onPointerMove = (e: PointerEvent) => {
      const maxWidth = Math.max(280, Math.min(window.innerWidth - 32, containerWidth))
      const maxHeight = Math.max(300, window.innerHeight - 120)

      const width = Math.min(maxWidth, Math.max(Math.min(340, maxWidth), startWidth + startX - e.clientX))
      const height = Math.min(maxHeight, Math.max(Math.min(360, maxHeight), startHeight + startY - e.clientY))

      windowEl.style.width = `${width}px`
      windowEl.style.height = `${height}px`
    }

    const onPointerUp = () => {
      handle.removeEventListener('pointermove', onPointerMove)
      handle.removeEventListener('pointerup', onPointerUp)
      handle.removeEventListener('pointercancel', onPointerUp)
    }

    handle.addEventListener('pointermove', onPointerMove)
    handle.addEventListener('pointerup', onPointerUp)
    handle.addEventListener('pointercancel', onPointerUp)
  }

  handle.addEventListener('pointerdown', onPointerDown)
  return true
}

/**
 * @n8n/chat mounts .chat-window asynchronously. This attaches the resize handle immediately
 * if possible, otherwise watches `container` until the window appears, then disconnects.
 * Returns the observer (if one was created) so the caller can disconnect it on cleanup.
 */
export function watchForChatWindow(container: Element, isCancelled: () => boolean): MutationObserver | null {
  if (attachChatResizeHandle(container)) return null

  const observer = new MutationObserver(() => {
    if (!isCancelled() && attachChatResizeHandle(container)) {
      observer.disconnect()
    }
  })
  observer.observe(container, { childList: true, subtree: true })
  return observer
}
