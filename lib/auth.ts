import { createClient } from '@/lib/supabase/server'
import { type HubRole, hasRole, mapCrmRole } from '@/lib/roles'

export type { HubRole } from '@/lib/roles'
export { hasRole } from '@/lib/roles'

export interface Session {
  userId: string
  orgId: string | null
  role: HubRole
  isSuper: boolean
}

export async function getSession(): Promise<Session | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const userId = user.id
  const orgId = user.app_metadata.org_id as string | null
  const crmRole = (user.app_metadata.role as string) || 'viewer'

  // Check for hub-specific role override
  let hubRole: HubRole = mapCrmRole(crmRole)

  if (orgId) {
    const { data: hubUserRole } = await supabase
      .from('hub_user_roles')
      .select('hub_role')
      .eq('user_id', userId)
      .eq('organization_id', orgId)
      .single()

    if (hubUserRole) {
      hubRole = hubUserRole.hub_role as HubRole
    }
  }

  return {
    userId,
    orgId,
    role: hubRole,
    isSuper: hubRole === 'super_admin',
  }
}

export async function requireAuth(minRole: HubRole = 'viewer'): Promise<Session> {
  const session = await getSession()
  if (!session) throw new Error('Unauthenticated')

  if (!hasRole(session.role, minRole)) {
    throw new Error('Unauthorized')
  }

  return session
}
