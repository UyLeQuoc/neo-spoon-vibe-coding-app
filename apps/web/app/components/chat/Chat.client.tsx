import { useStore } from '@nanostores/react'
import type { UIMessage } from 'ai'
import { useChat } from '@ai-sdk/react'
import { useAnimate } from 'framer-motion'
import { type DragEvent, memo, useEffect, useMemo, useRef, useState } from 'react'
import { cssTransition, ToastContainer, toast } from 'react-toastify'
import { useLocalStorage } from 'usehooks-ts'
import { createAuthenticatedChatTransport } from '~/lib/ai-transport'
import { useMessageParser, usePromptEnhancer, useShortcuts, useSnapScroll } from '~/lib/hooks'
import { useChatHistory, chatId } from '~/lib/persistence'
import { chatStore } from '~/lib/stores/chat'
import { walletAuthStore } from '~/lib/stores/wallet-auth.store'
import { workbenchStore } from '~/lib/stores/workbench'
import { fileModificationsToHTML } from '~/utils/diff'
import { cubicEasingFn } from '~/utils/easings'
import { isValidFileType } from '~/utils/fileValidation'
import { createScopedLogger, renderLogger } from '~/utils/logger'
import { DEFAULT_MODEL, DEFAULT_PROVIDER, type ModelConfig, type Provider } from '~/utils/modelConstants'
import { BaseChat } from './BaseChat'

const toastAnimation = cssTransition({
  enter: 'animated fadeInRight',
  exit: 'animated fadeOutRight'
})

const logger = createScopedLogger('Chat')

export function Chat() {
  renderLogger.trace('Chat')

  const { ready, initialMessages, storeMessageHistory } = useChatHistory()

  return (
    <>
      {ready && <ChatImpl initialMessages={initialMessages} storeMessageHistory={storeMessageHistory} />}
      <ToastContainer
        closeButton={({ closeToast }) => {
          return (
            <button className="Toastify__close-button" onClick={closeToast}>
              <div className="i-ph:x text-lg" />
            </button>
          )
        }}
        icon={({ type }) => {
          /**
           * @todo Handle more types if we need them. This may require extra color palettes.
           */
          switch (type) {
            case 'success': {
              return <div className="i-ph:check-bold text-neozero-elements-icon-success text-2xl" />
            }
            case 'error': {
              return <div className="i-ph:warning-circle-bold text-neozero-elements-icon-error text-2xl" />
            }
          }

          return undefined
        }}
        position="bottom-right"
        pauseOnFocusLoss
        transition={toastAnimation}
      />
    </>
  )
}

interface ChatProps {
  initialMessages: UIMessage[]
  storeMessageHistory: (messages: UIMessage[]) => Promise<void>
}

export const ChatImpl = memo(({ initialMessages, storeMessageHistory }: ChatProps) => {
  useShortcuts()

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const [chatStarted, setChatStarted] = useState(initialMessages.length > 0)

  const { showChat } = useStore(chatStore)

  const [animationScope, animate] = useAnimate()

  const [fileInputs, setFileInputs] = useState<FileList | null>(null)

  const addFiles = (files: FileList) => {
    const isValid = Array.from(files).every(isValidFileType)
    if (!isValid) {
      toast.error('Unsupported file type. Only images, text, pdf, csv, json, xml, and code files are supported.')
      return
    }

    setFileInputs(prev => {
      if (prev === null) {
        return files
      }

      const merged = new DataTransfer()

      for (let i = 0; i < prev.length; i++) {
        merged.items.add(prev[i])
      }

      for (let i = 0; i < files.length; i++) {
        merged.items.add(files[i])
      }

      return merged.files
    })
  }
  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { files } = event.target

    if (files) {
      addFiles(files)
    }
  }

  const removeFile = (index: number) => {
    setFileInputs(prev => {
      if (prev === null) {
        return null
      }

      const copy = new DataTransfer()

      for (let i = 0; i < prev.length; i++) {
        if (i !== index) {
          copy.items.add(prev[i])
        }
      }

      if (copy.items.length === 0) {
        return null
      }
      return copy.files
    })
  }

  const [modelConfig, setModelConfig] = useLocalStorage<ModelConfig>('chat_model_config', {
    provider: DEFAULT_PROVIDER,
    model: DEFAULT_MODEL
  })

  const authenticatedAddress = useStore(walletAuthStore.authenticatedAddress)
  const currentSessionId = useStore(chatId)

  // Input state management (not provided by useChat)
  const [input, setInput] = useState('')

  const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value)
  }

  // Create transport with current values
  const transport = useMemo(
    () =>
      createAuthenticatedChatTransport(
        authenticatedAddress || '',
        currentSessionId || 'default',
        modelConfig.model || DEFAULT_MODEL
      ),
    [authenticatedAddress, currentSessionId, modelConfig.model]
  )

  const chatHelpers = useChat({
    transport,
    onError: error => {
      logger.error('Request failed\n\n', error.message)
      toast.error('There was an error processing your request')
    },
    onFinish: () => {
      logger.debug('Finished streaming')
    },
    messages: initialMessages
  })

  const { messages, status, stop, sendMessage: sendChatMessage } = chatHelpers
  const isLoading = status === 'streaming'
  const { enhancingPrompt, promptEnhanced, enhancePrompt, resetEnhancer } = usePromptEnhancer()
  const { parsedMessages, parseMessages } = useMessageParser()

  const TEXTAREA_MAX_HEIGHT = chatStarted ? 400 : 200

  useEffect(() => {
    chatStore.setKey('started', initialMessages.length > 0)
  }, [initialMessages.length])

  useEffect(() => {
    parseMessages(messages, isLoading)

    if (messages.length > initialMessages.length) {
      storeMessageHistory(messages).catch(error => toast.error(error.message))
    }
  }, [messages, isLoading, parseMessages, initialMessages.length, storeMessageHistory])

  const scrollTextArea = () => {
    const textarea = textareaRef.current

    if (textarea) {
      textarea.scrollTop = textarea.scrollHeight
    }
  }

  const abort = () => {
    stop()
    chatStore.setKey('aborted', true)
    workbenchStore.abortAllActions()
  }

  useEffect(() => {
    const textarea = textareaRef.current

    if (textarea) {
      textarea.style.height = 'auto'

      const scrollHeight = textarea.scrollHeight

      textarea.style.height = `${Math.min(scrollHeight, TEXTAREA_MAX_HEIGHT)}px`
      textarea.style.overflowY = scrollHeight > TEXTAREA_MAX_HEIGHT ? 'auto' : 'hidden'
    }
  }, [TEXTAREA_MAX_HEIGHT])

  const runAnimation = async () => {
    if (chatStarted) {
      return
    }

    await Promise.all([
      animate('#examples', { opacity: 0, display: 'none' }, { duration: 0.1 }),
      animate('#intro', { opacity: 0, flex: 1 }, { duration: 0.2, ease: cubicEasingFn })
    ])

    chatStore.setKey('started', true)

    setChatStarted(true)
  }

  const sendMessage = async (_event: React.UIEvent, messageInput?: string) => {
    if (!authenticatedAddress) {
      toast.error('Please connect your wallet to send a message')
      return
    }

    const _input = messageInput || input

    if (_input.length === 0 || isLoading) {
      return
    }

    /**
     * @note (delm) Usually saving files shouldn't take long but it may take longer if there
     * many unsaved files. In that case we need to block user input and show an indicator
     * of some kind so the user is aware that something is happening. But I consider the
     * happy case to be no unsaved files and I would expect users to save their changes
     * before they send another message.
     */
    await workbenchStore.saveAllFiles()

    const fileModifications = workbenchStore.getFileModifcations()

    chatStore.setKey('aborted', false)

    runAnimation()

    if (fileModifications !== undefined) {
      const diff = fileModificationsToHTML(fileModifications)

      /**
       * If we have file modifications we send a new user message manually since we have to prefix
       * the user input with the file modifications and we don't want the new user input to appear
       * in the prompt. Using `sendMessage` triggers the API call and we manually reset the input.
       */
      await sendChatMessage({ text: `${diff}\n\n${_input}` })

      /**
       * After sending a new message we reset all modifications since the model
       * should now be aware of all the changes.
       */
      workbenchStore.resetAllFileModifications()
    } else {
      if (fileInputs && fileInputs.length > 0) {
        // Send message with file attachments
        await sendChatMessage({ text: _input, files: fileInputs })
      } else {
        // Send message without attachments
        await sendChatMessage({ text: _input })
      }
    }

    setFileInputs(null)

    setInput('')

    resetEnhancer()

    textareaRef.current?.blur()
  }

  const [messageRef, scrollRef] = useSnapScroll()

  const [isDragging, setIsDragging] = useState(false)

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(true)
  }
  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
  }
  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const droppedFiles = event.dataTransfer?.files || new DataTransfer().files
    const droppedFilesArray = Array.from(droppedFiles)
    if (droppedFilesArray.length > 0) {
      addFiles(droppedFiles)
    }
    setIsDragging(false)
  }

  // Terminal error handlers removed - terminal functionality has been removed

  const setProviderModel = (provider: string, model: string) => {
    setModelConfig({ ...modelConfig, provider: provider as Provider, model })
  }
  const handleModelConfigChange = (newModelConfig: ModelConfig) => {
    setModelConfig({ ...modelConfig, ...newModelConfig })
  }

  return (
    <BaseChat
      ref={animationScope}
      fileInputRef={fileInputRef}
      fileInputs={fileInputs}
      removeFile={removeFile}
      handleFileInputChange={handleFileInputChange}
      isDragging={isDragging}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      model={modelConfig.model}
      provider={modelConfig.provider}
      setProviderModel={setProviderModel}
      modelConfig={modelConfig}
      setModelConfig={handleModelConfigChange}
      textareaRef={textareaRef}
      input={input}
      showChat={showChat}
      chatStarted={chatStarted}
      isStreaming={isLoading}
      enhancingPrompt={enhancingPrompt}
      promptEnhanced={promptEnhanced}
      sendMessage={sendMessage}
      messageRef={messageRef}
      scrollRef={scrollRef}
      handleInputChange={handleInputChange}
      handleStop={abort}
      messages={messages.map((message, i) => {
        if (message.role === 'user') {
          return message
        }

        return {
          ...message,
          content: parsedMessages[i] || ''
        }
      })}
      enhancePrompt={() => {
        enhancePrompt(
          input,
          input => {
            setInput(input)
            scrollTextArea()
          },
          modelConfig
        )
      }}
    />
  )
})
