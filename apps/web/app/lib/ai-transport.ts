import type { UIMessage } from 'ai'
import { DefaultChatTransport } from 'ai'
import { walletAuthStore } from '~/lib/stores/wallet-auth.store'

export function createAuthenticatedChatTransport(userAddress: string, sessionId: string, modelId: string) {
  return new DefaultChatTransport({
    api: `/api/chat`,
    headers: async () => ({
      Authorization: `Bearer ${await walletAuthStore.getOrRefreshJwtToken()}`
    }),
    body: (messages: UIMessage[]) => ({
      messages,
      userAddress,
      sessionId,
      modelId
    })
  })
}
