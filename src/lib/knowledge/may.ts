/* MAY THIS PERSON ADD TO A LINE'S KNOWLEDGE? The screens' rule, read without a hook: a business's viewer reads and adds nothing
 * (supabase/ORG_VISIBILITY.sql, KNOWLEDGE.sql — the database refuses it too); anybody else who can open the line may. Not a permission:
 * it only keeps the app from writing what the cloud would refuse. */
import { myOrgRole } from '../../org/orgRole';
import { forcedOrgRole } from '../../org/orgStore';

export const mayAddKnowledge = (): boolean => (forcedOrgRole() ?? myOrgRole()) !== 'viewer';
