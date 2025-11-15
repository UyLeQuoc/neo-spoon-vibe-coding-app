import type { UIMessage } from 'ai'
import React from 'react'
import { PopoverHover } from '~/components/ui/PopoverHover'
import { classNames } from '~/utils/classNames'
import { AssistantMessage } from './AssistantMessage'
import { UserMessage } from './UserMessage'

interface MessagesProps {
  id?: string
  className?: string
  isStreaming?: boolean
  messages?: UIMessage[]
}

export const Messages = React.forwardRef<HTMLDivElement, MessagesProps>((props: MessagesProps, ref) => {
  const { id, isStreaming = false, messages = [] } = props

  return (
    <div id={id} ref={ref} className={props.className}>
      {messages.length > 0
        ? messages.map((message, index) => {
            const { role, parts } = message
            const isUserMessage = role === 'user'
            const isFirst = index === 0
            const isLast = index === messages.length - 1

            // Extract file attachments from parts (AI SDK v5)
            // Files are typically stored as data-* parts or source-* parts
            const attachments = parts.filter(
              part =>
                part.type.startsWith('data-') ||
                part.type === 'source-url' ||
                part.type === 'source-document' ||
                (part.type.startsWith('tool-') && 'data' in part && (part as any).data?.url)
            )

            // Extract text parts
            const textParts = parts.filter(part => part.type === 'text')

            return (
              <div
                key={message.id || index}
                className={classNames('flex gap-4 p-6 w-full rounded-[calc(0.75rem-1px)]', {
                  'bg-neozero-elements-messages-background': isUserMessage || !isStreaming || (isStreaming && !isLast),
                  'bg-gradient-to-b from-neozero-elements-messages-background from-30% to-transparent':
                    isStreaming && isLast,
                  'mt-4': !isFirst
                })}
              >
                {isUserMessage && (
                  <div className="flex items-center justify-center w-[34px] h-[34px] overflow-hidden bg-white text-gray-600 rounded-full shrink-0 self-start">
                    <div className="i-ph:user-fill text-xl"></div>
                  </div>
                )}
                <div className="grid grid-col-1 w-full">
                  {/* Render text parts */}
                  {isUserMessage
                    ? textParts.map((part, partIndex) =>
                        part.type === 'text' ? (
                          <UserMessage key={`user-message-${index}-${partIndex}`} content={part.text} />
                        ) : null
                      )
                    : textParts.map((part, partIndex) =>
                        part.type === 'text' ? (
                          <AssistantMessage key={`assistant-message-${index}-${partIndex}`} content={part.text} />
                        ) : null
                      )}

                  {/* Render file/image attachments */}
                  {attachments.length > 0 && (
                    <div className="flex flex-col gap-5 p-4">
                      <div className="px-5 flex gap-5">
                        <div className="flex flex-row gap-2">
                          {attachments.map((attachment, attachmentIndex) => {
                            // Extract attachment info from different possible structures
                            const attachmentData = (attachment as any).data || attachment
                            const attachmentUrl = attachmentData?.url || attachmentData?.src
                            const attachmentName = attachmentData?.name || attachmentData?.filename || 'Attachment'
                            const contentType = attachmentData?.contentType || attachmentData?.type || ''
                            const isImage = contentType.includes('image') || attachmentUrl?.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)

                            return (
                              <div className="relative" key={`attachment-${index}-${attachmentIndex}`}>
                                <div className="relative flex rounded-lg border border-neozero-elements-borderColor overflow-hidden">
                                  <PopoverHover>
                                    <PopoverHover.Trigger>
                                      <button className="h-20 w-20 bg-transparent outline-none">
                                        {isImage && attachmentUrl ? (
                                          <img
                                            className="object-cover w-full h-full"
                                            src={attachmentUrl}
                                            alt={attachmentName}
                                          />
                                        ) : (
                                          <div className="flex items-center justify-center w-full h-full text-neozero-elements-textTertiary">
                                            <div className="i-ph:file" />
                                          </div>
                                        )}
                                      </button>
                                    </PopoverHover.Trigger>
                                    <PopoverHover.Content>
                                      <span className="text-xs text-neozero-elements-textTertiary">
                                        {attachmentName}
                                      </span>
                                    </PopoverHover.Content>
                                  </PopoverHover>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })
        : null}
      {isStreaming && (
        <div className="text-center w-full text-neozero-elements-textSecondary i-svg-spinners:3-dots-fade text-4xl mt-4"></div>
      )}
    </div>
  )
})
