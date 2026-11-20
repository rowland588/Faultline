/* Register Faultline with Microsoft, automatically (public/microsoft-setup.sh — docs/CONNECTED-LUNA.md): the script run for real by bash
 * against a stand-in `az` that answers as Azure Cloud Shell's would and keeps every call. Proves, with nothing of Microsoft's touched:
 * a new registration made multitenant with the read-only permissions by the ids Graph's own entry gives (never typed), the sign-in
 * address set as a single-page application, its directory entry made and the permissions approved for the organisation, and the ONE
 * link back into Faultline with the Application ID; run again, the registration found and brought up to date — nothing made twice,
 * a second sign-in address kept beside the first; a directory where the account may not approve says so and still gives the link. */
import { describe, expect, it } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, chmodSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SCRIPT = join(process.cwd(), 'public/microsoft-setup.sh');
/* the stand-in: each call kept as a line in calls.log; what it answers depends on the state kept in its folder */
const FAKE = String.raw`#!/usr/bin/env bash
set -u
D="$FAKE_DIR"; echo "$*" >>"$D/calls.log"
args="$*"
case "$args" in
  "account show"*"--query tenantId"*) echo "tenant-1";;
  "account show"*) echo '{}';;
  "ad sp show --id 00000003-0000-0000-c000-000000000000 --query oauth2PermissionScopes"*)
    v="$(sed -E "s/.*value=='([^']+)'.*/\1/" <<<"$args")"; echo "scope-$v";;
  "ad sp show --id 00000003-0000-0000-c000-000000000000 --query id"*) echo "graph-sp";;
  "ad app list"*) cat "$D/apps.json" 2>/dev/null || echo '[]';;
  "ad app create"*) cp "$(sed -E 's/.*--required-resource-accesses @([^ ]+).*/\1/' <<<"$args")" "$D/rra.json"; echo '[{"appId":"app-new","displayName":"Faultline","spa":{"redirectUris":[]}}]' >"$D/apps.json"; echo "app-new";;
  "ad app update"*) cp "$(sed -E 's/.*--required-resource-accesses @([^ ]+).*/\1/' <<<"$args")" "$D/rra.json"; echo '{}';;
  "ad app show --id "*"--query id"*) echo "obj-1";;
  "ad app show --id "*"-o json"*) jq -c '.[0]' "$D/apps.json";;
  "rest --method PATCH --uri https://graph.microsoft.com/v1.0/applications/"*) b="$(sed -E 's/.*--body (.*)$/\1/' <<<"$args")"; echo "$b" >"$D/spa.json"; jq -c --argjson s "$b" '.[0].spa = $s.spa' "$D/apps.json" >"$D/a2" && mv "$D/a2" "$D/apps.json";;
  "ad sp show --id app-"*"--query id"*) [ -f "$D/sp" ] && echo "sp-1" || exit 3;;
  "ad sp show --id app-"*) [ -f "$D/sp" ] || exit 3; echo '{}';;
  "ad sp create"*) touch "$D/sp"; echo '{}';;
  "rest --method GET --uri https://graph.microsoft.com/v1.0/oauth2PermissionGrants"*) [ -f "$D/grant.json" ] && echo "grant-1" || echo "";;
  "rest --method POST --uri https://graph.microsoft.com/v1.0/oauth2PermissionGrants"*) [ -f "$D/refuse" ] && exit 1; sed -E 's/.*--body (.*)$/\1/' <<<"$args" >"$D/grant.json";;
  "rest --method PATCH --uri https://graph.microsoft.com/v1.0/oauth2PermissionGrants/"*) [ -f "$D/refuse" ] && exit 1; echo patched >>"$D/grant-patched";;
  *) echo "unknown call: $args" >&2; exit 9;;
esac
`;
function run(d: string, env: Record<string, string> = {}): string {
  return execFileSync('bash', [SCRIPT], { env: { ...process.env, PATH: `${d}/bin:${process.env.PATH}`, FAKE_DIR: d, ...env }, encoding: 'utf8', timeout: 60_000 });
}
function stand(): string {
  const d = mkdtempSync(join(tmpdir(), 'mssetup-'));
  execFileSync('mkdir', ['-p', `${d}/bin`]);
  writeFileSync(`${d}/bin/az`, FAKE); chmodSync(`${d}/bin/az`, 0o755);
  writeFileSync(`${d}/bin/sleep`, '#!/usr/bin/env bash\nexit 0\n'); chmodSync(`${d}/bin/sleep`, 0o755);
  return d;
}

/* The script runs where Azure Cloud Shell's tools are: bash and jq. Vercel's build machine has no jq (20 November: three of these
   failed there and held two releases back), so it is proved where jq is — every gate here, and GitHub's checks, where it MUST be:
   on GitHub Actions a missing jq is a failure, never a skip. */
const hasJq = spawnSync('jq', ['--version']).status === 0;
it('on GitHub Actions the set-up script is always proved (jq is there)', () => {
  if (process.env.GITHUB_ACTIONS === 'true') expect(hasJq).toBe(true);
});

describe.skipIf(!hasJq)('Register Faultline with Microsoft — the set-up script', () => {
  it('makes the registration multitenant with read-only permissions by Graph’s own ids, the SPA sign-in address, approves it, and gives the one link', () => {
    const d = stand();
    const out = run(d);
    const calls = readFileSync(`${d}/calls.log`, 'utf8');
    expect(calls).toMatch(/ad app create --display-name Faultline --sign-in-audience AzureADMultipleOrgs --required-resource-accesses @/);
    const rra = JSON.parse(readFileSync(`${d}/rra.json`, 'utf8'));
    expect(rra).toEqual([{ resourceAppId: '00000003-0000-0000-c000-000000000000', resourceAccess: ['openid', 'profile', 'offline_access', 'User.Read', 'Files.Read.All', 'Sites.Read.All'].map(s => ({ id: `scope-${s}`, type: 'Scope' })) }]);
    expect(JSON.parse(readFileSync(`${d}/spa.json`, 'utf8'))).toEqual({ spa: { redirectUris: ['https://faultline.opexelevate.co.uk/ms-auth.html'] } });
    expect(existsSync(`${d}/sp`)).toBe(true);
    expect(JSON.parse(readFileSync(`${d}/grant.json`, 'utf8'))).toEqual({ clientId: 'sp-1', consentType: 'AllPrincipals', resourceId: 'graph-sp', scope: 'openid profile offline_access User.Read Files.Read.All Sites.Read.All' });
    expect(out).toContain('Made the registration Faultline.');
    expect(out).toContain('Approved for your organisation');
    expect(out).toContain('Application (client) ID: app-new');
    expect(out).toContain('https://faultline.opexelevate.co.uk/#/factory/data?ms=1&id=app-new');
    expect(calls).not.toMatch(/secret|credential reset|password/i);
  });

  it('run again: found and brought up to date — nothing made twice, another address kept beside the first, the approval updated', () => {
    const d = stand();
    run(d);
    const out = run(d, { FAULTLINE_URL: 'https://preview.example.app' });
    const calls = readFileSync(`${d}/calls.log`, 'utf8');
    expect(calls.match(/ad app create/g)).toHaveLength(1);
    expect(calls).toMatch(/ad app update --id app-new --sign-in-audience AzureADMultipleOrgs/);
    expect(calls.match(/ad sp create/g)).toHaveLength(1);
    expect(JSON.parse(readFileSync(`${d}/spa.json`, 'utf8')).spa.redirectUris.sort()).toEqual(['https://faultline.opexelevate.co.uk/ms-auth.html', 'https://preview.example.app/ms-auth.html']);
    expect(existsSync(`${d}/grant-patched`)).toBe(true);
    expect(out).toContain('Found the registration Faultline');
    expect(out).toContain('https://preview.example.app/#/factory/data?ms=1&id=app-new');
  });

  it('an account that may not approve apps: said, and the link still given', () => {
    const d = stand();
    writeFileSync(`${d}/refuse`, '');
    const out = run(d);
    expect(out).toContain('Not approved for your organisation');
    expect(out).toContain('#/factory/data?ms=1&id=app-new');
  });
});
