/* MY ROLE IN THE BUSINESS, remembered on this device (src/org/orgStore useBusiness writes it as it reads the business) — so a screen
 * deciding what to offer (cloud/access useAccess) knows it without reading the business itself, and with no signal knows what it knew.
 * Not a permission: the database decides (supabase/ORG_VISIBILITY.sql); this only keeps a button from being offered that it would
 * refuse. */
import { isOrgRole, type OrgRole } from './organisation';

const KEY = 'faultline.org.role';
export function myOrgRole(): OrgRole | undefined {
  try { const v = localStorage.getItem(KEY); return isOrgRole(v) ? v : undefined; } catch { return undefined; }
}
export function rememberOrgRole(r: OrgRole | undefined): void {
  try { if (r) localStorage.setItem(KEY, r); else localStorage.removeItem(KEY); } catch { /* fine */ }
}
