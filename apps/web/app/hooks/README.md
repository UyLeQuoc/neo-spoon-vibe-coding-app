# React Query Hooks

This directory contains React Query hooks for API calls using `@tanstack/react-query`.

## Setup

The following dependencies are already installed:
- `@tanstack/react-query` - For data fetching and caching
- `react-toastify` - For toast notifications
- `lucide-react` - For icons

## Usage Examples

### Query Hook (GET requests)

```typescript
import { useBalanceQuery } from '~/hooks/queries/balance.query'

function MyComponent() {
  const { data: balance, isLoading, error } = useBalanceQuery()

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  return <div>Balance: {balance}</div>
}
```

### Mutation Hook (POST/PUT/DELETE requests)

```typescript
import { useCreatePendingPayment } from '~/hooks/mutation/create-pending-payment.mutation'

function MyComponent() {
  const createPayment = useCreatePendingPayment()

  const handleCreate = async () => {
    createPayment.mutate({
      nonce: 'unique-nonce',
      amount: 100000000 // in smallest unit
    })
  }

  return (
    <button onClick={handleCreate} disabled={createPayment.isPending}>
      {createPayment.isPending ? 'Creating...' : 'Create Payment'}
    </button>
  )
}
```

### Using Query Keys

```typescript
import { queryKeys } from '~/hooks/keys'
import { useQueryClient } from '@tanstack/react-query'

function MyComponent() {
  const queryClient = useQueryClient()

  // Invalidate and refetch
  queryClient.invalidateQueries({
    queryKey: queryKeys.balance(address)
  })
}
```

## Available Hooks

### Queries
- `useBalanceQuery()` - Get user balance
- `usePendingPaymentQuery()` - Get pending payment
- `useTransactionsQuery(options)` - Get transaction history with pagination

### Mutations
- `useCreatePendingPayment()` - Create a pending payment
- `useVerifyPaymentTransaction()` - Verify a payment transaction
- `useCreateTestSandbox()` - Create a test sandbox

## Toast Notifications

Toast notifications are automatically handled in mutations. Use `react-toastify`:

```typescript
import { toast } from 'react-toastify'

toast.success('Success message')
toast.error('Error message')
toast.info('Info message')
toast.warning('Warning message')
```

## Icons (Lucide React)

```typescript
import { Check, X, Loader2 } from 'lucide-react'

<Check className="w-4 h-4" />
<X className="w-4 h-4" />
<Loader2 className="w-4 h-4 animate-spin" />
```

