// import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'
// import { DropdownMenuSeparator } from '@radix-ui/react-dropdown-menu'
// import { Label } from '@radix-ui/react-label'
// import * as Select from '@radix-ui/react-select'
import type { UIMessage } from 'ai'
import { AnimatePresence, motion } from 'framer-motion'
import React, { type RefCallback } from 'react'
import { Menu } from '~/components/sidebar/Menu'
import { SubMenu } from '~/components/sidebar/SubMenu'
import { IconButton } from '~/components/ui/IconButton'
import { PopoverHover } from '~/components/ui/PopoverHover'
import { Workbench } from '~/components/workbench/Workbench'
// import { useModelsQuery } from '~/hooks/queries/models.query'
import { classNames } from '~/utils/classNames'
// import { debounce } from '~/utils/debounce'
import type { ModelConfig } from '~/utils/modelConstants'
import styles from './BaseChat.module.scss'
import { Messages } from './Messages'
import { SendButton } from './SendButton'

interface BaseChatProps {
  textareaRef?: React.RefObject<HTMLTextAreaElement> | undefined

  isDragging?: boolean
  onDragOver?: (event: React.DragEvent<HTMLDivElement>) => void
  onDragLeave?: (event: React.DragEvent<HTMLDivElement>) => void
  onDrop?: (event: React.DragEvent<HTMLDivElement>) => void

  fileInputRef?: React.RefObject<HTMLInputElement> | undefined
  fileInputs?: FileList | null
  removeFile?: (index: number) => void
  handleFileInputChange?: (event: React.ChangeEvent<HTMLInputElement>) => void

  model?: string
  provider?: string
  setProviderModel?: (provider: string, model: string) => void
  modelConfig?: ModelConfig
  setModelConfig?: (config: ModelConfig) => void

  messageRef?: RefCallback<HTMLDivElement> | undefined
  scrollRef?: RefCallback<HTMLDivElement> | undefined
  showChat?: boolean
  chatStarted?: boolean
  isStreaming?: boolean
  messages?: UIMessage[]
  enhancingPrompt?: boolean
  promptEnhanced?: boolean
  input?: string
  handleStop?: () => void
  sendMessage?: (event: React.UIEvent, messageInput?: string) => void
  handleInputChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void
  enhancePrompt?: () => void
}

const EXAMPLE_PROMPTS = [
  { text: 'Build a todo app in React using Tailwind' },
  { text: 'Create a simple landing page for a SaaS product' },
  { text: 'Create a simple portfolio website' },
  { text: 'Create a simple blog website' }
]

const TEXTAREA_MIN_HEIGHT = 76

// interface ModelSelectProps {
//   chatStarted: boolean
//   model?: string
//   provider?: string
//   setProviderModel?: (provider: string, model: string) => void
// }
// const ModelSelect = ({ model, provider, setProviderModel }: ModelSelectProps) => {
//   const [search, setSearch] = React.useState('')
//   const [debouncedSearch, setDebouncedSearch] = React.useState('')

//   const debouncedSetSearch = React.useCallback(
//     debounce((searchTerm: string) => {
//       setDebouncedSearch(searchTerm)
//     }, 300),
//     []
//   )

//   React.useEffect(() => {
//     debouncedSetSearch(search)
//   }, [search, debouncedSetSearch])

//   const { data: filteredModels = [], isLoading } = useModelsQuery(debouncedSearch)

//   const providers = Array.from(new Set(filteredModels.map((model: any) => model.provider)))
//   const currentModel: ModelInfo | undefined = filteredModels.find(
//     (m: any) => m.name === model && m.provider === provider
//   )

//   return (
//     <Select.Root
//       value={model ? `${provider}-${model}` : undefined}
//       onValueChange={value => {
//         const [provider, ...rest] = value.split('-')
//         const model = rest.join('-')
//         setProviderModel?.(provider, model)
//       }}
//     >
//       <Select.Trigger className="inline-flex items-center justify-center gap-1 px-2 py-1 text-sm rounded bg-transparent hover:bg-neozero-elements-background-depth-1 text-neozero-elements-textPrimary">
//         <Select.Value>
//           {isLoading && (
//             <div className="i-svg-spinners:90-ring-with-bg text-neozero-elements-loader-progress text-sm" />
//           )}
//           {!isLoading && currentModel && (
//             <div className="flex items-center gap-1">
//               <div className="i-ph:gear text-sm" />
//               <span className="truncate">
//                 {currentModel.label} (In: ${currentModel.inputPrice}, Out: ${currentModel.outputPrice})
//               </span>
//             </div>
//           )}
//           {!isLoading && !currentModel && <span>Select model</span>}
//         </Select.Value>
//         <div className="i-ph:caret-down text-sm opacity-50" />
//       </Select.Trigger>
//       <Select.Portal>
//         <Select.Content
//           position={'popper'}
//           side={'top'}
//           sideOffset={5}
//           className="overflow-hidden bg-neozero-elements-background-depth-1 rounded-md border border-neozero-elements-borderColor shadow-md z-50 w-[var(--radix-select-trigger-width)] min-w-[220px] max-h-50vh"
//         >
//           <div className="p-2 border-b border-neozero-elements-borderColor" onClick={e => e.stopPropagation()}>
//             <div className="relative">
//               <input
//                 className="w-full px-2 py-1 text-sm bg-neozero-elements-background-depth-2 rounded border border-neozero-elements-borderColor focus:outline-none"
//                 placeholder="Search models..."
//                 value={search}
//                 onChange={e => setSearch(e.target.value)}
//                 onKeyDown={e => e.stopPropagation()}
//               />
//               {isLoading && (
//                 <div className="absolute right-2 top-1/2 -translate-y-1/2">
//                   <div className="i-svg-spinners:90-ring-with-bg text-neozero-elements-loader-progress text-sm" />
//                 </div>
//               )}
//             </div>
//           </div>
//           <Select.ScrollUpButton />
//           <Select.Viewport className="p-2">
//             {providers.map(providerName => {
//               const providerModels = filteredModels.filter((model: any) => model.provider === providerName)

//               if (providerModels.length === 0) return null

//               return (
//                 <Select.Group key={providerName}>
//                   <Select.Label className="px-6 py-2 text-xs font-medium text-neozero-elements-textTertiary">
//                     {providerName}
//                   </Select.Label>
//                   {providerModels.map((modelItem: any) => (
//                     <Select.Item
//                       key={`${modelItem.provider}-${modelItem.name}`}
//                       value={`${modelItem.provider}-${modelItem.name}`}
//                       className="relative flex items-center px-6 py-2 text-sm text-neozero-elements-textPrimary rounded select-none
//                         hover:bg-neozero-elements-item-backgroundAccent
//                         data-[disabled]:opacity-50
//                         data-[disabled]:pointer-events-none
//                         data-[highlighted]:bg-neozero-elements-item-backgroundAccent
//                         data-[highlighted]:outline-none
//                         cursor-default
//                         focus:outline-none"
//                     >
//                       <Select.ItemText>
//                         {modelItem.label} (In: ${modelItem.inputPrice}, Out: ${modelItem.outputPrice})
//                       </Select.ItemText>
//                       <Select.ItemIndicator className="absolute left-2">
//                         <div className="i-ph:check text-sm" />
//                       </Select.ItemIndicator>
//                     </Select.Item>
//                   ))}
//                 </Select.Group>
//               )
//             })}
//           </Select.Viewport>
//         </Select.Content>
//       </Select.Portal>
//     </Select.Root>
//   )
// }

// const ModelConfigDropdown = ({
//   modelConfig,
//   setModelConfig
// }: {
//   modelConfig: ModelConfig
//   setModelConfig: (config: ModelConfig) => void
// }) => {
//   if (!modelConfig) {
//     return (
//       <button
//         className="flex items-center text-neozero-elements-item-contentDefault bg-transparent enabled:hover:text-neozero-elements-item-contentActive rounded-md p-1 enabled:hover:bg-neozero-elements-item-backgroundActive disabled:cursor-not-allowed"
//         disabled
//       >
//         <div className="i-mdi:settings text-sm text-red"></div>
//       </button>
//     )
//   }
//   return (
//     <DropdownMenuPrimitive.Root>
//       <DropdownMenuPrimitive.Trigger asChild>
//         <button
//           title="Model configuration"
//           className="flex items-center text-neozero-elements-item-contentDefault bg-transparent enabled:hover:text-neozero-elements-item-contentActive rounded-md p-1 enabled:hover:bg-neozero-elements-item-backgroundActive disabled:cursor-not-allowed"
//         >
//           <div className="i-mdi:settings text-sm"></div>
//         </button>
//       </DropdownMenuPrimitive.Trigger>
//       <DropdownMenuPrimitive.Portal>
//         <DropdownMenuPrimitive.Content
//           side={'right'}
//           align={'start'}
//           alignOffset={5}
//           className="z-max min-w-[8rem] p-2 overflow-hidden color-white rounded-md border border-neozero-elements-borderColor shadow-md bg-neozero-elements-background-depth-1"
//         >
//           <div className="flex flex-col gap-2 px-2 py-2">
//             <Label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
//               API Key
//             </Label>
//             <input
//               name="apiKey"
//               type="password"
//               placeholder="API Key"
//               required={true}
//               defaultValue={modelConfig.apiKey}
//               onChange={(e: any) =>
//                 setModelConfig({
//                   apiKey: e.target.value.length > 0 ? e.target.value : undefined
//                 })
//               }
//               className="flex h-9 w-full px-3 py-1 rounded-md border border-neozero-elements-borderColor bg-transparent text-neozero-elements-textPrimary placeholder-neozero-elements-textTertiary focus:outline-none focus:border-neozero-elements-item-backgroundAccent"
//             />

//             <DropdownMenuSeparator className="-mx-1 my-1 h-px bg-neozero-elements-borderColor" />

//             <Label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
//               Temperature
//             </Label>
//             <input
//               name="temperature"
//               type="number"
//               placeholder="Auto"
//               required={true}
//               defaultValue={modelConfig.temperature}
//               min={0}
//               max={2}
//               onChange={(e: any) =>
//                 setModelConfig({
//                   temperature: e.target.value.length > 0 ? parseFloat(e.target.value) : undefined
//                 })
//               }
//               className="flex h-9 w-full px-3 py-1 rounded-md border border-neozero-elements-borderColor bg-transparent text-neozero-elements-textPrimary placeholder-neozero-elements-textTertiary focus:outline-none focus:border-neozero-elements-item-backgroundAccent"
//             />

//             <Label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
//               Top P
//             </Label>
//             <input
//               name="topP"
//               type="number"
//               placeholder="Auto"
//               required={true}
//               defaultValue={modelConfig.topP}
//               min={0}
//               max={1}
//               onChange={(e: any) =>
//                 setModelConfig({
//                   topP: e.target.value.length > 0 ? parseFloat(e.target.value) : undefined
//                 })
//               }
//               className="flex h-9 w-full px-3 py-1 rounded-md border border-neozero-elements-borderColor bg-transparent text-neozero-elements-textPrimary placeholder-neozero-elements-textTertiary focus:outline-none focus:border-neozero-elements-item-backgroundAccent"
//             />

//             <Label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
//               Top K
//             </Label>
//             <input
//               name="topK"
//               type="number"
//               placeholder="Auto"
//               required={true}
//               defaultValue={modelConfig.topK}
//               onChange={(e: any) =>
//                 setModelConfig({
//                   topK: e.target.value.length > 0 ? parseFloat(e.target.value) : undefined
//                 })
//               }
//               className="flex h-9 w-full px-3 py-1 rounded-md border border-neozero-elements-borderColor bg-transparent text-neozero-elements-textPrimary placeholder-neozero-elements-textTertiary focus:outline-none focus:border-neozero-elements-item-backgroundAccent"
//             />
//           </div>
//         </DropdownMenuPrimitive.Content>
//       </DropdownMenuPrimitive.Portal>
//     </DropdownMenuPrimitive.Root>
//   )
// }

export const BaseChat = React.forwardRef<HTMLDivElement, BaseChatProps>(
  (
    {
      textareaRef,

      isDragging,
      onDragOver,
      onDragLeave,
      onDrop,

      fileInputRef,
      fileInputs,
      removeFile,
      handleFileInputChange,

      // model,
      // provider,
      // setProviderModel,
      // modelConfig = {},
      // setModelConfig = () => {},

      messageRef,
      scrollRef,
      showChat = true,
      chatStarted = false,
      isStreaming = false,
      enhancingPrompt = false,
      promptEnhanced = false,
      messages,
      input = '',
      sendMessage,
      handleInputChange,
      enhancePrompt,
      handleStop
    },
    ref
  ) => {
    const TEXTAREA_MAX_HEIGHT = chatStarted ? 400 : 200

    return (
      <div
        ref={ref}
        className={classNames(styles.BaseChat, 'relative flex h-full w-full overflow-hidden')}
        data-chat-visible={showChat}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <AnimatePresence>
          {isDragging && (
            <motion.div
              className="fixed pointer-events-none top-0 left-0 w-full h-full flex flex-col items-center justify-center z-50 backdrop-filter backdrop-blur-[32px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.8 }}
              exit={{ opacity: 0 }}
            >
              <div className="i-ph:file text-4xl text-neozero-elements-textPrimary"></div>
              <div className="text-neozero-elements-textPrimary">Drop files here</div>
            </motion.div>
          )}
        </AnimatePresence>
        <SubMenu />
        <Menu />
        <div ref={scrollRef} className="flex overflow-y-auto w-full h-full">
          <div className={classNames(styles.Chat, 'flex flex-col flex-grow min-w-[var(--chat-min-width)] h-full')}>
            {!chatStarted && (
              <div id="intro" className="mt-[26vh] max-w-chat mx-auto">
                <div className="mb-2 animate-fade-in">
                  <h1 className="text-xl md:text-2xl lg:text-5xl font-bold tracking-tight mb-2">
                    <span className="text-slate-900">What can </span>
                    <span className="bg-gradient-to-r from-green-500 to-green-600 bg-clip-text text-transparent">
                      NeoZero
                    </span>
                    <span className="text-slate-900"> build for you?</span>
                  </h1>
                  <p className="text-lg md:text-xl text-slate-500 leading-relaxed">
                    Build stunning apps and websites by chatting with AI
                  </p>
                </div>
              </div>
            )}
            <div
              className={classNames('pt-6 px-6', {
                'h-full flex flex-col': chatStarted
              })}
            >
              {chatStarted ? (
                <Messages
                  ref={messageRef}
                  className="flex flex-col w-full flex-1 max-w-chat px-4 pb-6 mx-auto z-1"
                  messages={messages}
                  isStreaming={isStreaming}
                />
              ) : null}
              <div
                className={classNames('relative w-full max-w-chat mx-auto z-prompt', {
                  'sticky bottom-0': chatStarted
                })}
              >
                <div
                  className={classNames(
                    'shadow-sm border border-neozero-elements-borderColor backdrop-filter backdrop-blur-[8px] rounded-lg overflow-hidden'
                  )}
                >
                  {fileInputs && (
                    <div className="flex flex-col gap-5 bg-neozero-elements-background-depth-1 p-4">
                      <div className="px-5 flex gap-5">
                        {Array.from(fileInputs).map((file, index) => {
                          return (
                            <div className="relative" key={index}>
                              <div className="relative flex rounded-lg border border-neozero-elements-borderColor overflow-hidden">
                                <PopoverHover>
                                  <PopoverHover.Trigger>
                                    <button className="h-20 w-20 bg-transparent outline-none">
                                      {file.type.includes('image') ? (
                                        <img
                                          className="object-cover w-full h-full"
                                          src={URL.createObjectURL(file)}
                                          alt={file.name}
                                        />
                                      ) : (
                                        <div className="flex items-center justify-center w-full h-full text-neozero-elements-textTertiary">
                                          <div className="i-ph:file" />
                                        </div>
                                      )}
                                    </button>
                                  </PopoverHover.Trigger>
                                  <PopoverHover.Content>
                                    <span className="text-xs text-neozero-elements-textTertiary">{file.name}</span>
                                  </PopoverHover.Content>
                                </PopoverHover>
                              </div>
                              <button
                                className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 rounded-full w-[18px] h-[18px] flex items-center justify-center z-1 bg-neozero-elements-background-depth-1 hover:bg-neozero-elements-background-depth-3 border border-neozero-elements-borderColor text-neozero-elements-button-secondary-text"
                                onClick={() => removeFile?.(index)}
                              >
                                <div className="i-ph:x scale-70"></div>
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                  <textarea
                    ref={textareaRef}
                    className={`w-full pl-4 pt-4 pr-16 focus:outline-none resize-none text-md text-neozero-elements-textPrimary placeholder-neozero-elements-textTertiary bg-transparent`}
                    onKeyDown={event => {
                      if (event.key === 'Enter') {
                        if (event.shiftKey) {
                          return
                        }

                        event.preventDefault()

                        sendMessage?.(event)
                      }
                    }}
                    value={input}
                    onChange={event => {
                      handleInputChange?.(event)
                    }}
                    style={{
                      minHeight: TEXTAREA_MIN_HEIGHT,
                      maxHeight: TEXTAREA_MAX_HEIGHT
                    }}
                    placeholder="How can NeoZero help you today?"
                    translate="no"
                  />
                  <SendButton
                    show={input.length > 0 || isStreaming}
                    isStreaming={isStreaming}
                    onClick={event => {
                      if (isStreaming) {
                        handleStop?.()
                        return
                      }
                      sendMessage?.(event)
                    }}
                  />
                  <div className="flex justify-between text-sm p-4 pt-2">
                    <div className="flex gap-1 items-center">
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept=".jpg,.jpeg,.png,.gif,.webp,.svg,.pdf,.txt,.doc,.docx,.py,.ipynb,.js,.mjs,.cjs,.jsx,.html,.css,.scss,.sass,.ts,.tsx,.java,.cs,.php,.c,.cc,.cpp,.cxx,.h,.hh,.hpp,.rs,.swift,.go,.rb,.kt,.kts,.scala,.sh,.bash,.zsh,.bat,.csv,.log,.ini,.cfg,.config,.json,.yaml,.yml,.toml,.lua,.sql,.md,.tex,.latex,.asm,.ino,.s"
                        multiple
                        style={{ display: 'none', visibility: 'hidden' }}
                        onChange={handleFileInputChange}
                      />
                      <IconButton
                        title="Upload files"
                        disabled={isStreaming}
                        className="pr-1.5 enabled:hover:bg-neozero-elements-item-backgroundAccent!"
                        onClick={() => fileInputRef?.current?.click()}
                      >
                        <div className="i-ph:link text-xl"></div>
                      </IconButton>
                      <IconButton
                        title="Enhance prompt"
                        disabled={input.length === 0 || enhancingPrompt}
                        className={classNames({
                          'opacity-100!': enhancingPrompt,
                          'text-neozero-elements-item-contentAccent! pr-1.5 enabled:hover:bg-neozero-elements-item-backgroundAccent!':
                            promptEnhanced
                        })}
                        onClick={() => enhancePrompt?.()}
                      >
                        {enhancingPrompt ? (
                          <>
                            <div className="i-svg-spinners:90-ring-with-bg text-neozero-elements-loader-progress text-xl"></div>
                            <div className="ml-1.5">Enhancing prompt...</div>
                          </>
                        ) : (
                          <>
                            <div className="i-neozero:stars text-xl"></div>
                            {promptEnhanced && <div className="ml-1.5">Prompt enhanced</div>}
                          </>
                        )}
                      </IconButton>
                    </div>
                    {input.length > 3 ? (
                      <div className="text-xs text-neozero-elements-textTertiary">
                        Use <kbd className="kdb">Shift</kbd> + <kbd className="kdb">Return</kbd> for a new line
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="bg-neozero-elements-background-depth-1 pb-6">{/* Ghost Element */}</div>
              </div>
            </div>
            {!chatStarted && (
              <div id="examples" className="relative w-full max-w-xl mx-auto mt-8 flex justify-center">
                <div className="flex flex-col space-y-2 [mask-image:linear-gradient(to_bottom,black_0%,transparent_180%)] hover:[mask-image:none]">
                  {EXAMPLE_PROMPTS.map((examplePrompt, index) => {
                    return (
                      <button
                        key={index}
                        onClick={event => {
                          sendMessage?.(event, examplePrompt.text)
                        }}
                        className="group flex items-center w-full gap-2 justify-center bg-transparent text-neozero-elements-textTertiary hover:text-neozero-elements-textPrimary transition-theme"
                      >
                        {examplePrompt.text}
                        <div className="i-ph:arrow-bend-down-left" />
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
          <Workbench chatStarted={chatStarted} isStreaming={isStreaming} />
        </div>
      </div>
    )
  }
)
