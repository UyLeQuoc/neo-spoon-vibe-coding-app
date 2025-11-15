// Query keys
export const queryKeys = {
  balance: (address?: string | null) => ['balance', address] as const,
  pendingPayment: (address?: string | null) => ['pendingPayment', address] as const,
  transactions: (address?: string | null, page?: number, pageSize?: number) =>
    ['transactions', address, page, pageSize] as const,
  storageCost: (fileSize: number, epochs: number) => ['storageCost', fileSize, epochs] as const,
  currentEpoch: () => ['currentEpoch'] as const,
  suiBalance: (address?: string) => ['suiBalance', address] as const,
  walBalance: (address?: string) => ['walBalance', address] as const,
  // Sandbox keys
  sandbox: {
    all: ['sandbox'] as const,
    status: (sandboxId: string | null) => ['sandbox', sandboxId, 'status'] as const,
    command: (sandboxId: string | null, cmdId: string | null) => ['sandbox', sandboxId, 'cmd', cmdId] as const,
    commands: (sandboxId: string | null) => ['sandbox', sandboxId, 'commands'] as const,
    commandLogs: (sandboxId: string | null, cmdId: string | null) =>
      ['sandbox', sandboxId, 'cmd', cmdId, 'logs'] as const
  },
  session: {
    files: (sessionId: string | null) => ['session-files', sessionId] as const,
    commandLogs: (sessionId: string | null, cmdId: string | null) =>
      ['session', sessionId, 'cmd', cmdId, 'logs'] as const
  },
  // NeoNS keys
  neons: {
    isAvailable: (domain: string) => ['neons', 'isAvailable', domain] as const,
    properties: (domain: string) => ['neons', 'properties', domain] as const,
    ownerOf: (domain: string) => ['neons', 'ownerOf', domain] as const,
    balanceOf: (owner: string | null) => ['neons', 'balanceOf', owner] as const,
    domains: (owner: string | null, limit?: number, offset?: number) =>
      ['neons', 'domains', owner, limit, offset] as const
  }
} as const
