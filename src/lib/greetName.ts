/* THE NAME A GREETING USES (12 November, docs/LUNA-DEMO.md). "Good morning, rowlandglew35" is a sign-in, not a name. In order: the
 * first name of the brand the person set (Your brand), the name they said is theirs on the actions (the bell's For you), else the
 * first part of their e-mail only when it is plainly a first name ("rowland.glew@…" → "Rowland"); otherwise no name at all. */
import { firstName } from './brand';
import { myName } from './forYou';

export function greetName(email?: string | null): string {
  const brand = firstName();
  if (brand) return brand;
  const said = myName().trim().split(/\s+/)[0];
  if (said) return said;
  const local = (email ?? '').split('@')[0] ?? '';
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (parts.length < 2) return '';
  const first = parts[0].replace(/\d+/g, '');
  return /^[a-z]{2,}$/i.test(first) ? first[0].toUpperCase() + first.slice(1).toLowerCase() : '';
}
