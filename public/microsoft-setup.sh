#!/usr/bin/env bash
# REGISTER FAULTLINE WITH MICROSOFT — automatically, once (20 November 2026, docs/CONNECTED-LUNA.md — Rowland: "what I need is an
# automated system ready to go").
#
# Run it in Azure Cloud Shell (shell.azure.com — already signed in as you), one line:
#     curl -fsSL https://faultline.opexelevate.co.uk/microsoft-setup.sh | bash
#
# It finds, or makes, the app registration "Faultline" in your Microsoft Entra:
#   - people from ANY organisation may sign in (multitenant), so your clients' people can too;
#   - signed in from the browser with PKCE — no client secret is made;
#   - Faultline's sign-in address as a single-page-application redirect;
#   - read-only Microsoft Graph permissions: User.Read, Files.Read.All, Sites.Read.All (and openid, profile, offline_access) — their ids
#     read from Microsoft Graph's own entry in your directory, never typed in here;
# then approves those permissions for YOUR organisation when your account may, and prints ONE link that opens Faultline with the
# Application ID in hand — the administrator presses Save for everyone and every device is ready. It changes nothing else in Microsoft
# 365, and it is safe to run again (it finds what it made). FAULTLINE_URL=… to register another address of Faultline as well.
set -euo pipefail

FAULTLINE="${FAULTLINE_URL:-https://faultline.opexelevate.co.uk}"
NAME="${FAULTLINE_APP_NAME:-Faultline}"
REDIRECT="${FAULTLINE%/}/ms-auth.html"
GRAPH_APP="00000003-0000-0000-c000-000000000000"   # Microsoft Graph
SCOPES="openid profile offline_access User.Read Files.Read.All Sites.Read.All"

say()  { printf '\n\033[1m%s\033[0m\n' "$*"; }
note() { printf '  %s\n' "$*"; }
fail() { printf '\n\033[1;31m%s\033[0m\n' "$*" >&2; exit 1; }

command -v az >/dev/null 2>&1 || fail "This needs the Azure CLI. Open https://shell.azure.com (it is already there, signed in as you) and run the line again."
command -v jq >/dev/null 2>&1 || fail "This needs jq (Azure Cloud Shell has it). Run it in https://shell.azure.com."
az account show >/dev/null 2>&1 || fail "Not signed in to Azure. Open https://shell.azure.com and run the line again there."
TENANT="$(az account show --query tenantId -o tsv)"

say "Registering ${NAME} with Microsoft (your directory ${TENANT})"

# ---- the permissions, by their ids in Microsoft Graph's own entry
RRA="$(mktemp)"; trap 'rm -f "$RRA"' EXIT
ACCESS="[]"
for s in $SCOPES; do
  id="$(az ad sp show --id "$GRAPH_APP" --query "oauth2PermissionScopes[?value=='${s}'].id | [0]" -o tsv)"
  [ -n "$id" ] || fail "Microsoft Graph in your directory has no permission called ${s}."
  ACCESS="$(jq -c --arg id "$id" '. + [{id: $id, type: "Scope"}]' <<<"$ACCESS")"
done
jq -n --arg app "$GRAPH_APP" --argjson access "$ACCESS" '[{resourceAppId: $app, resourceAccess: $access}]' >"$RRA"

# ---- the registration: found by its sign-in address (or its name), else made
APP_ID="$(az ad app list --display-name "$NAME" -o json | jq -r --arg r "$REDIRECT" --arg n "$NAME" \
  '([.[] | select((.spa.redirectUris // []) | index($r))] + [.[] | select(.displayName == $n)]) | .[0].appId // empty')"
if [ -n "$APP_ID" ]; then
  note "Found the registration ${NAME} — bringing it up to date."
  az ad app update --id "$APP_ID" --sign-in-audience AzureADMultipleOrgs --required-resource-accesses "@${RRA}" >/dev/null
else
  APP_ID="$(az ad app create --display-name "$NAME" --sign-in-audience AzureADMultipleOrgs --required-resource-accesses "@${RRA}" --query appId -o tsv)"
  note "Made the registration ${NAME}."
fi
OBJECT_ID="$(az ad app show --id "$APP_ID" --query id -o tsv)"

# ---- the sign-in address, as a single-page application (kept beside any already there)
SPA="$(az ad app show --id "$APP_ID" -o json | jq -c --arg r "$REDIRECT" '{spa: {redirectUris: (((.spa.redirectUris // []) + [$r]) | unique)}}')"
az rest --method PATCH --uri "https://graph.microsoft.com/v1.0/applications/${OBJECT_ID}" --headers "Content-Type=application/json" --body "$SPA" >/dev/null
note "Sign-in address: ${REDIRECT} (single-page application, no secret)."

# ---- its entry in your directory, then approved for your organisation where your account may
az ad sp show --id "$APP_ID" >/dev/null 2>&1 || az ad sp create --id "$APP_ID" >/dev/null
SP_ID="$(az ad sp show --id "$APP_ID" --query id -o tsv)"
GRAPH_SP="$(az ad sp show --id "$GRAPH_APP" --query id -o tsv)"
GRANT="$(jq -n --arg c "$SP_ID" --arg r "$GRAPH_SP" --arg s "$SCOPES" '{clientId: $c, consentType: "AllPrincipals", resourceId: $r, scope: $s}')"
APPROVED="no"
for _ in 1 2 3; do
  have="$(az rest --method GET --uri "https://graph.microsoft.com/v1.0/oauth2PermissionGrants?\$filter=clientId eq '${SP_ID}' and consentType eq 'AllPrincipals'" --query "value[0].id" -o tsv 2>/dev/null || true)"
  if [ -n "$have" ] && [ "$have" != "None" ]; then
    az rest --method PATCH --uri "https://graph.microsoft.com/v1.0/oauth2PermissionGrants/${have}" --headers "Content-Type=application/json" --body "{\"scope\":\"${SCOPES}\"}" >/dev/null 2>&1 && APPROVED="yes"
  else
    az rest --method POST --uri "https://graph.microsoft.com/v1.0/oauth2PermissionGrants" --headers "Content-Type=application/json" --body "$GRANT" >/dev/null 2>&1 && APPROVED="yes"
  fi
  [ "$APPROVED" = "yes" ] && break
  sleep 10   # a new entry can take a moment to reach every part of Microsoft's directory
done
if [ "$APPROVED" = "yes" ]; then note "Approved for your organisation: everyone in it can sign in without being asked."
else note "Not approved for your organisation — your account may not approve apps. Faultline's set-up gives your IT administrator the link (step 4)."; fi

LINK="${FAULTLINE%/}/#/factory/data?ms=1&id=${APP_ID}"
say "Done — Faultline is registered with Microsoft."
note "Application (client) ID: ${APP_ID}"
say "Open this link to hand it to Faultline (then press Save for everyone):"
printf '  %s\n\n' "$LINK"
