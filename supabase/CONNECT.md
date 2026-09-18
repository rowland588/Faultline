# Connecting Claude to Supabase

Do this on your own machine. A hosted Claude Code session cannot reach Supabase:
its egress proxy answers 403 to `api.supabase.com`, `mcp.supabase.com` and the
project's own host, before any credential is sent. Your laptop has no such
proxy, and it has a browser for the login — which the OAuth step needs.

Once this is done it stays done, and Claude can read and change the database
directly instead of writing SQL for you to paste.

## 1. Get the branch

`.mcp.json` lives on the working branch, not on `main`, so `git pull` alone
will not bring it.

    git fetch origin claude/faultline-connection-1vx7kt
    git checkout claude/faultline-connection-1vx7kt

Check it arrived:

    cat .mcp.json          # should mention mcp.supabase.com and the project ref

## 2. Start Claude Code in this folder

    claude

First run in a directory with a project-scoped MCP server asks whether you
trust it. Say yes — it is the `.mcp.json` in this repo, pointing at Supabase's
own server.

## 3. Authenticate

    /mcp

Pick **supabase**, then **Authenticate**. A browser opens; sign in to Supabase
and grant access to the project. Back in the terminal it should read
`supabase ... connected`.

If it still says "Pending approval", leave `/mcp` and reopen it — approval and
authentication are two separate steps.

## 4. Apply what is outstanding

Ask for it in words:

> run supabase/RUN_ME.sql against the project

RUN_ME.sql is the three outstanding migrations in dependency order. It is safe
whatever state the database is in, and safe to run twice. It ends with seven
rows that should each read OK.

## 5. Check it actually syncs

> check commissioning syncs: every column the mapper writes is present, rows
> carry a rev, an edit moves the rev forward, and RLS lets me read my own rows
> but not anyone else's

There is also a script that does this without the MCP server, for CI or if the
MCP route is unavailable. It takes its credentials from the environment rather
than from arguments, so they stay out of shell history:

    SUPABASE_ACCESS_TOKEN=sbp_...  \
    SUPABASE_PROJECT_REF=eqdigvzbljofxznqtfia \
    node supabase/apply.mjs --verify-only

## If step 3 fails

- **403 or a refused connection** — you are still in a hosted session, not a
  local one. Check `echo $HTTPS_PROXY` is empty.
- **The browser never opens** — run `claude` in a normal terminal, not inside
  an IDE's integrated terminal.
- **Authenticated but no tools appear** — restart `claude`; the tool list is
  read at startup.
