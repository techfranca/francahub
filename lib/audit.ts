import { createClient } from '@/lib/supabase/server'

/**
 * Log an action to the audit trail.
 * Call this from API routes after mutations.
 */
export async function logAudit({
  userId,
  action,
  entityType,
  entityId,
  changes,
}: {
  userId: string
  action: 'create' | 'update' | 'delete' | 'view' | 'export'
  entityType: 'client' | 'meeting' | 'campaign' | 'insight' | 'credential' | 'tag'
  entityId?: string | null
  changes?: Record<string, unknown>
}) {
  const supabase = createClient()

  await supabase.from('hub_audit_log').insert({
    user_id: userId,
    action,
    entity_type: entityType,
    entity_id: entityId || null,
    changes: changes || {},
  })
}
