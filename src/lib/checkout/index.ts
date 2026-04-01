export {
  checkoutAsset,
  returnSerializedAsset,
  returnBulkAssignment,
  updateAssignment,
} from './domain'
export type { DomainResult } from './domain'
export { createSupabaseCheckoutPorts } from './supabase-adapter'
export type { CheckoutRepository, AuditPort, CheckoutPorts } from './ports'
