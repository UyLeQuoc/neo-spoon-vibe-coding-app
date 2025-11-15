import type {
  Neo3EventListener,
  Neo3EventListenerCallback,
  Neo3Invoker,
  Neo3Parser
} from '@cityofzion/neon-dappkit-types'
import * as Invocation from './api'

export type SmartContractConfig = {
  scriptHash: string
  invoker: Neo3Invoker
  parser?: Neo3Parser
  eventListener?: Neo3EventListener | null
}

export class VibeCodingAppPaymentContract {
  static SCRIPT_HASH = '0x3b548112507aad8ab8a1a2d7da62b163d97c27d7'

  private config: Required<SmartContractConfig>

  constructor(configOptions: SmartContractConfig) {
    this.config = {
      ...configOptions,
      parser: configOptions.parser ?? require('@cityofzion/neon-dappkit').NeonParser,
      eventListener: configOptions.eventListener ?? null
    }
  }

  async confirmPaymentReceivedEvent(txId: string): Promise<void> {
    if (!this.config.eventListener) throw new Error('EventListener not provided')

    const txResult = await this.config.eventListener.waitForApplicationLog(txId)
    this.config.eventListener.confirmTransaction(txResult, {
      contract: this.config.scriptHash,
      eventname: 'PaymentReceived'
    })
  }

  listenPaymentReceivedEvent(callback: Neo3EventListenerCallback): void {
    if (!this.config.eventListener) throw new Error('EventListener not provided')

    this.config.eventListener.addEventListener(this.config.scriptHash, 'PaymentReceived', callback)
  }

  removePaymentReceivedEventListener(callback: Neo3EventListenerCallback): void {
    if (!this.config.eventListener) throw new Error('EventListener not provided')

    this.config.eventListener.removeEventListener(this.config.scriptHash, 'PaymentReceived', callback)
  }

  async onNEP17Payment(params: { from: string; amount: number; data: any }): Promise<string> {
    return await this.config.invoker.invokeFunction({
      invocations: [Invocation.onNEP17PaymentAPI(this.config.scriptHash, params, this.config.parser)],
      signers: []
    })
  }

  async testOnNEP17Payment(params: { from: string; amount: number; data: any }): Promise<void> {
    const res = await this.config.invoker.testInvoke({
      invocations: [Invocation.onNEP17PaymentAPI(this.config.scriptHash, params, this.config.parser)],
      signers: []
    })

    if (res.stack.length === 0) {
      throw new Error(res.exception ?? 'unrecognized response')
    }
  }
}
