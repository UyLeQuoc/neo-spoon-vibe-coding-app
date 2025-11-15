import { factory } from '~/factory'
import { balanceRoute } from './api.balance'
import { authRoutes } from './auth'
import { avatarProxyRoute } from './avatar/api.avatar-proxy'
import { chatRoute } from './chat/api.chat'
import { rpcProxyRoute } from './neons/api.rpc-proxy'
import { createPendingPaymentRoute } from './payment/api.create-pending-payment'
import { getPendingPaymentRoute } from './payment/api.get-pending-payment'
import { getTransactionsRoute } from './payment/api.get-transactions'
import { updatePendingPaymentStatusRoute } from './payment/api.update-pending-payment-status'
import { verifyPaymentTransactionRoute } from './payment/api.verify-payment-transaction'

export const routes = factory
  .createApp()
  .route('/', authRoutes)
  .route('/', balanceRoute)
  .route('/', createPendingPaymentRoute)
  .route('/', getPendingPaymentRoute)
  .route('/', getTransactionsRoute)
  .route('/', updatePendingPaymentStatusRoute)
  .route('/', verifyPaymentTransactionRoute)
  .route('/', rpcProxyRoute)
  .route('/', avatarProxyRoute)
  .route('/', chatRoute)
