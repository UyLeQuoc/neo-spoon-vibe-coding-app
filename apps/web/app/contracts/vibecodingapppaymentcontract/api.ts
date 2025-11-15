import type { ContractInvocation, Neo3Parser } from '@cityofzion/neon-dappkit-types'

export function onNEP17PaymentAPI(
  scriptHash: string,
  params: { from: string; amount: number; data: any },
  parser: Neo3Parser
): ContractInvocation {
  return {
    scriptHash,
    operation: 'onNEP17Payment',
    args: [
      parser.formatRpcArgument(params.from, { type: 'Hash160' }),
      parser.formatRpcArgument(params.amount, { type: 'Integer' }),
      parser.formatRpcArgument(params.data, { type: 'Any' })
    ]
  }
}
