export type HubRole = 'super_admin' | 'admin' | 'manager' | 'analyst' | 'viewer'
export type CrmRole = 'super_admin' | 'admin' | 'seller' | 'viewer'

const HUB_ROLE_HIERARCHY: HubRole[] = ['viewer', 'analyst', 'manager', 'admin', 'super_admin']

const CRM_TO_HUB_ROLE: Record<CrmRole, HubRole> = {
  super_admin: 'super_admin',
  admin: 'admin',
  seller: 'analyst',
  viewer: 'viewer',
}

export function hasRole(role: HubRole, minRole: HubRole): boolean {
  return HUB_ROLE_HIERARCHY.indexOf(role) >= HUB_ROLE_HIERARCHY.indexOf(minRole)
}

export function mapCrmRole(crmRole: string): HubRole {
  return CRM_TO_HUB_ROLE[crmRole as CrmRole] || 'viewer'
}
