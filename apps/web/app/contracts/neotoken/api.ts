import type { ContractInvocation, Neo3Parser } from '@cityofzion/neon-dappkit-types'

export function balanceOfAPI(scriptHash: string, params: { account: string }, parser: Neo3Parser): ContractInvocation {
  return {
    scriptHash,
    operation: 'balanceOf',
    args: [parser.formatRpcArgument(params.account, { type: 'Hash160' })]
  }
}

export function decimalsAPI(scriptHash: string): ContractInvocation {
  return {
    scriptHash,
    operation: 'decimals',
    args: []
  }
}

export function getAccountStateAPI(
  scriptHash: string,
  params: { account: string },
  parser: Neo3Parser
): ContractInvocation {
  return {
    scriptHash,
    operation: 'getAccountState',
    args: [parser.formatRpcArgument(params.account, { type: 'Hash160' })]
  }
}

export function getAllCandidatesAPI(scriptHash: string): ContractInvocation {
  return {
    scriptHash,
    operation: 'getAllCandidates',
    args: []
  }
}

export function getCandidateVoteAPI(
  scriptHash: string,
  params: { pubKey: string },
  parser: Neo3Parser
): ContractInvocation {
  return {
    scriptHash,
    operation: 'getCandidateVote',
    args: [parser.formatRpcArgument(params.pubKey, { type: 'PublicKey' })]
  }
}

export function getCandidatesAPI(scriptHash: string): ContractInvocation {
  return {
    scriptHash,
    operation: 'getCandidates',
    args: []
  }
}

export function getCommitteeAPI(scriptHash: string): ContractInvocation {
  return {
    scriptHash,
    operation: 'getCommittee',
    args: []
  }
}

export function getCommitteeAddressAPI(scriptHash: string): ContractInvocation {
  return {
    scriptHash,
    operation: 'getCommitteeAddress',
    args: []
  }
}

export function getGasPerBlockAPI(scriptHash: string): ContractInvocation {
  return {
    scriptHash,
    operation: 'getGasPerBlock',
    args: []
  }
}

export function getNextBlockValidatorsAPI(scriptHash: string): ContractInvocation {
  return {
    scriptHash,
    operation: 'getNextBlockValidators',
    args: []
  }
}

export function getRegisterPriceAPI(scriptHash: string): ContractInvocation {
  return {
    scriptHash,
    operation: 'getRegisterPrice',
    args: []
  }
}

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

export function registerCandidateAPI(
  scriptHash: string,
  params: { pubkey: string },
  parser: Neo3Parser
): ContractInvocation {
  return {
    scriptHash,
    operation: 'registerCandidate',
    args: [parser.formatRpcArgument(params.pubkey, { type: 'PublicKey' })]
  }
}

export function setGasPerBlockAPI(
  scriptHash: string,
  params: { gasPerBlock: number },
  parser: Neo3Parser
): ContractInvocation {
  return {
    scriptHash,
    operation: 'setGasPerBlock',
    args: [parser.formatRpcArgument(params.gasPerBlock, { type: 'Integer' })]
  }
}

export function setRegisterPriceAPI(
  scriptHash: string,
  params: { registerPrice: number },
  parser: Neo3Parser
): ContractInvocation {
  return {
    scriptHash,
    operation: 'setRegisterPrice',
    args: [parser.formatRpcArgument(params.registerPrice, { type: 'Integer' })]
  }
}

export function symbolAPI(scriptHash: string): ContractInvocation {
  return {
    scriptHash,
    operation: 'symbol',
    args: []
  }
}

export function totalSupplyAPI(scriptHash: string): ContractInvocation {
  return {
    scriptHash,
    operation: 'totalSupply',
    args: []
  }
}

export function transferAPI(
  scriptHash: string,
  params: { from: string; to: string; amount: number; data: any },
  parser: Neo3Parser
): ContractInvocation {
  return {
    scriptHash,
    operation: 'transfer',
    args: [
      parser.formatRpcArgument(params.from, { type: 'Hash160' }),
      parser.formatRpcArgument(params.to, { type: 'Hash160' }),
      parser.formatRpcArgument(params.amount, { type: 'Integer' }),
      parser.formatRpcArgument(params.data, { type: 'Any' })
    ]
  }
}

export function unclaimedGasAPI(
  scriptHash: string,
  params: { account: string; end: number },
  parser: Neo3Parser
): ContractInvocation {
  return {
    scriptHash,
    operation: 'unclaimedGas',
    args: [
      parser.formatRpcArgument(params.account, { type: 'Hash160' }),
      parser.formatRpcArgument(params.end, { type: 'Integer' })
    ]
  }
}

export function unregisterCandidateAPI(
  scriptHash: string,
  params: { pubkey: string },
  parser: Neo3Parser
): ContractInvocation {
  return {
    scriptHash,
    operation: 'unregisterCandidate',
    args: [parser.formatRpcArgument(params.pubkey, { type: 'PublicKey' })]
  }
}

export function voteAPI(
  scriptHash: string,
  params: { account: string; voteTo: string },
  parser: Neo3Parser
): ContractInvocation {
  return {
    scriptHash,
    operation: 'vote',
    args: [
      parser.formatRpcArgument(params.account, { type: 'Hash160' }),
      parser.formatRpcArgument(params.voteTo, { type: 'PublicKey' })
    ]
  }
}
