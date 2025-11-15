import { zValidator } from '@hono/zod-validator'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import z from 'zod'
import { apiFailed, ok } from 'shared'
import { dbSchema, pendingPaymentsTable, usersTable, transactionsTable } from '~/db/schema'
import { factory } from '~/factory'
import { authMiddware } from '~/middlewares/auth.middleware'
import { getOrCreateUser } from '../api.balance'
import { toApiPendingPayment } from './helpers'
import type { ApiPendingPayment } from './helpers'
// Payment contract script hash (testnet)
const PAYMENT_CONTRACT_HASH = '0x3b548112507aad8ab8a1a2d7da62b163d97c27d7'

const verifyPaymentInputSchema = z.object({
  txDigest: z.string().min(1, 'Transaction digest is required'),
  pendingPaymentId: z.string().min(1, 'Pending payment ID is required')
})

export type VerifyPaymentResponse = {
  pendingPayment: ApiPendingPayment
  pointsAdded: number
  newBalance: number
}

// POST /verify-payment-transaction
export const verifyPaymentTransactionRoute = factory
  .createApp()
  .post(
    '/verify-payment-transaction',
    authMiddware,
    zValidator('json', verifyPaymentInputSchema),
    async c => {
      const { sub: userAddr } = c.get('jwtPayload') ?? {}
      const { txDigest, pendingPaymentId } = c.req.valid('json')

      const db = drizzle(c.env.DB, { schema: dbSchema })

      try {
        // Get pending payment
        const pendingPayment = await db
          .select()
          .from(pendingPaymentsTable)
          .where(eq(pendingPaymentsTable.id, pendingPaymentId))
          .get()

        if (!pendingPayment) {
          return c.json(
            apiFailed({
              code: 'PENDING_PAYMENT_NOT_FOUND',
              message: 'Pending payment not found'
            }),
            404
          )
        }

        if (pendingPayment.address !== userAddr) {
          return c.json(
            apiFailed({
              code: 'UNAUTHORIZED',
              message: 'Unauthorized to verify this payment'
            }),
            403
          )
        }

        if (pendingPayment.status !== 'signed') {
          return c.json(
            apiFailed({
              code: 'INVALID_STATUS',
              message: 'Payment must be signed before verification'
            }),
            400
          )
        }

        // Verify transaction on blockchain using RPC getapplicationlog
        const RPC_URL = 'http://seed3t5.neo.org:20332'
        // Contract hash formats: with/without 0x, uppercase/lowercase
        const contractHashVariants = [
          PAYMENT_CONTRACT_HASH.toLowerCase().replace('0x', ''),
          PAYMENT_CONTRACT_HASH.toLowerCase(),
          PAYMENT_CONTRACT_HASH.replace('0x', ''),
          PAYMENT_CONTRACT_HASH
        ]
        const GAS_TOKEN_HASH = '0xd2a4cff31913016155e38e474a2c06d08be276cf'
        const gasTokenHashVariants = [
          GAS_TOKEN_HASH.toLowerCase().replace('0x', ''),
          GAS_TOKEN_HASH.toLowerCase(),
          GAS_TOKEN_HASH.replace('0x', ''),
          GAS_TOKEN_HASH
        ]

        try {
          // Get application log for the transaction
          const logResponse = await fetch(RPC_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: 1,
              method: 'getapplicationlog',
              params: [txDigest]
            })
          })

          const logData = (await logResponse.json()) as {
            result?: {
              executions?: Array<{
                notifications?: Array<{
                  contract: string
                  eventname: string
                  state?: {
                    value?: Array<unknown>
                  }
                }>
              }>
            }
            error?: { message: string }
          }

          if (logData.error) {
            return c.json(
              apiFailed({
                code: 'TRANSACTION_NOT_FOUND',
                message: `Transaction not found on blockchain: ${logData.error.message}`
              }),
              404
            )
          }

          if (!logData.result?.executions) {
            return c.json(
              apiFailed({
                code: 'INVALID_TRANSACTION',
                message: 'Transaction does not have application log'
              }),
              400
            )
          }

          // Collect all notifications for debugging
          const allNotifications: Array<{ contract: string; eventname: string }> = []
          let gasTransferFound = false
          let paymentEventFound = false

          // Helper to normalize contract hash for comparison
          // Remove 0x prefix and convert to lowercase, but keep leading zeros
          function normalizeHash(hash: string): string {
            return hash.toLowerCase().replace('0x', '')
          }

          // Normalize contract hash variants
          const normalizedContractHashes = contractHashVariants.map(normalizeHash)
          const normalizedGasTokenHashes = gasTokenHashVariants.map(normalizeHash)

          for (const execution of logData.result.executions) {
            if (!execution.notifications) continue

            for (const notification of execution.notifications) {
              const notifContract = normalizeHash(notification.contract)
              allNotifications.push({
                contract: notification.contract,
                eventname: notification.eventname
              })

              // Check for GAS token transfer to payment contract
              // Transfer event format: [from, to, amount]
              if (
                normalizedGasTokenHashes.includes(notifContract) &&
                notification.eventname === 'Transfer'
              ) {
                // Check if transfer is to payment contract
                const stateValue = notification.state?.value
                if (Array.isArray(stateValue) && stateValue.length >= 2) {
                  const toValue = stateValue[1]
                  // Handle different value formats from RPC
                  let toAddress = ''
                  if (typeof toValue === 'object' && toValue !== null) {
                    if ('value' in toValue) {
                      toAddress = String(toValue.value)
                    }
                  } else {
                    toAddress = String(toValue)
                  }
                  
                  const normalizedToAddress = normalizeHash(toAddress)
                  
                  // Check if transfer destination matches payment contract
                  if (normalizedContractHashes.some(hash => normalizedToAddress === hash)) {
                    gasTransferFound = true
                    console.log('GAS transfer to payment contract found:', {
                      from: stateValue[0],
                      to: toAddress,
                      amount: stateValue[2]
                    })
                  }
                }
              }

              // Check for PaymentReceived event from payment contract
              if (
                normalizedContractHashes.includes(notifContract) &&
                notification.eventname === 'PaymentReceived'
              ) {
                paymentEventFound = true
                console.log('PaymentReceived event found from contract:', notification.contract)
              }
            }
          }

          // Log notifications for debugging
          console.log('Transaction notifications:', JSON.stringify(allNotifications, null, 2))
          console.log('Normalized contract hash variants:', normalizedContractHashes)
          console.log('GAS transfer found:', gasTransferFound)
          console.log('Payment event found:', paymentEventFound)

          // Accept if either PaymentReceived event exists OR GAS transfer to contract exists
          // (in case contract doesn't emit event but still processes payment)
          if (!paymentEventFound && !gasTransferFound) {
            return c.json(
              apiFailed({
                code: 'PAYMENT_EVENT_NOT_FOUND',
                message: `Transaction does not contain PaymentReceived event or GAS transfer to payment contract. Found notifications: ${allNotifications.map(n => `${n.contract.slice(0, 12)}...${n.eventname}`).join(', ')}`
              }),
              400
            )
          }
        } catch (error) {
          console.error('Failed to verify transaction on blockchain:', error)
          return c.json(
            apiFailed({
              code: 'BLOCKCHAIN_VERIFICATION_FAILED',
              message: `Failed to verify transaction on blockchain: ${error instanceof Error ? error.message : 'Unknown error'}`
            }),
            500
          )
        }

        // Update payment status to verified
        await db
          .update(pendingPaymentsTable)
          .set({
            status: 'verified',
            updatedAt: new Date()
          })
          .where(eq(pendingPaymentsTable.id, pendingPaymentId))
          .run()

        // Get updated payment
        const updatedPayment = await db
          .select()
          .from(pendingPaymentsTable)
          .where(eq(pendingPaymentsTable.id, pendingPaymentId))
          .get()

        if (!updatedPayment) {
          return c.json(
            apiFailed({
              code: 'PAYMENT_NOT_FOUND_AFTER_UPDATE',
              message: 'Payment not found after update'
            }),
            500
          )
        }

        // Add points to user balance (1 GAS = 1000 points, amount is in smallest unit)
        const pointsToAdd = Math.floor((pendingPayment.amount / 100000000) * 1000)
        const user = await getOrCreateUser(db, userAddr)
        const newBalance = (user.balance || 0) + pointsToAdd

        await db
          .update(usersTable)
          .set({ balance: newBalance })
          .where(eq(usersTable.address, userAddr))
          .run()

        // Insert transaction record
        await db.insert(transactionsTable).values({
          address: userAddr,
          amount: pointsToAdd,
          note: `Payment verified: ${txDigest.slice(0, 16)}...`,
          timestamp: new Date()
        })

        return c.json(
          ok<VerifyPaymentResponse>({
            pendingPayment: toApiPendingPayment(updatedPayment),
            pointsAdded: pointsToAdd,
            newBalance
          })
        )
      } catch (error) {
        console.error('Failed to verify payment transaction:', error)
        return c.json(
          apiFailed({
            code: 'VERIFY_PAYMENT_FAILED',
            message: 'Failed to verify payment transaction'
          }),
          500
        )
      }
    }
  )
