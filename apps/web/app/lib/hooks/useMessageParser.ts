import type { UIMessage } from 'ai'
import { useCallback, useState } from 'react'
import { StreamingMessageParser } from '~/lib/runtime/message-parser'
import { workbenchStore } from '~/lib/stores/workbench'
import { createScopedLogger } from '~/utils/logger'

const logger = createScopedLogger('useMessageParser')

const messageParser = new StreamingMessageParser({
  callbacks: {
    onArtifactOpen: data => {
      logger.trace('onArtifactOpen', data)

      workbenchStore.showWorkbench.set(true)
      workbenchStore.addArtifact(data)
    },
    onArtifactClose: data => {
      logger.trace('onArtifactClose')

      workbenchStore.updateArtifact(data, { closed: true })
    },
    onActionOpen: data => {
      logger.trace('onActionOpen', data.action)

      // we only add shell actions when when the close tag got parsed because only then we have the content
      if (data.action.type !== 'shell') {
        workbenchStore.addAction(data)
      }
    },
    onActionClose: data => {
      logger.trace('onActionClose', data.action)

      if (data.action.type === 'shell') {
        workbenchStore.addAction(data)
      }

      workbenchStore.runAction(data)
    }
  }
})

export function useMessageParser() {
  const [parsedMessages, setParsedMessages] = useState<{ [key: number]: string }>({})

  const parseMessages = useCallback((messages: UIMessage[], isLoading: boolean) => {
    let reset = false

    if (import.meta.env.DEV && !isLoading) {
      reset = true
      messageParser.reset()
    }

    for (const [index, message] of messages.entries()) {
      if (message.role === 'assistant') {
        // Extract text content from parts (AI SDK v5)
        // In v5, messages use 'parts' array instead of 'content' string
        const textParts = message.parts
          .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
          .map(part => part.text)
          .join('')

        const newParsedContent = messageParser.parse(message.id, textParts)

        setParsedMessages(prevParsed => ({
          ...prevParsed,
          [index]: !reset ? (prevParsed[index] || '') + newParsedContent : newParsedContent
        }))
      }
    }
  }, [])

  return { parsedMessages, parseMessages }
}
