/* Shown when the app doesn't know where its backend is. Rather than silently
 * running local-only with no sign-in (invisible, undiagnosable), we say so and
 * let the credentials be pasted in right here — no redeploy, no host settings. */
import { useState } from 'react';
import { LogoMark } from '../ui/Logo';
import { saveCloudConfig } from '../cloud/config';

export function CloudSetup({ onUseLocal }: { onUseLocal: () => void }) {
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [err, setErr] = useState('');

  const save = () => {
    setErr('');
    try { saveCloudConfig(url, key); }        // reloads on success
    catch (e) { setErr(e instanceof Error ? e.message : 'Could not save those values.'); }
  };

  return (
    <div className="landing">
      <div className="landing-inner">
        <section className="landing-hero">
          <div className="landing-brand">
            <LogoMark size={40} />
            <span className="landing-name">Faultline</span>
          </div>
          <h1 className="landing-h1">Connect your account</h1>
          <p className="landing-lede">
            This copy of Faultline doesn't know where its backend is yet, so sign-in and
            sync are switched off. Paste the two values below once and this device is
            connected — no redeploy needed.
          </p>
          <ul className="landing-points">
            <li><span className="landing-point-dot" aria-hidden /><span>
              <b>Where to find them</b>
              <span className="sub">Supabase → your project → Settings → API. Copy the <b>Project URL</b> and the <b>anon</b> (publishable) key.</span>
            </span></li>
            <li><span className="landing-point-dot" aria-hidden /><span>
              <b>Is this safe?</b>
              <span className="sub">Yes — the anon key is public by design and ships inside every web app. Your data is protected by per-user security rules on the server, not by hiding this key.</span>
            </span></li>
          </ul>
        </section>

        <section className="landing-auth card">
          <div className="landing-auth-head">
            <h2 className="landing-auth-title">Backend details</h2>
            <p className="sub">Stored on this device. You'll only do this once.</p>
          </div>

          <label className="field-label">Project URL</label>
          <input className="text-input" autoFocus value={url} placeholder="https://abcdefgh.supabase.co"
            autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false}
            onChange={e => setUrl(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') save(); }} />

          <label className="field-label" style={{ marginTop: 10 }}>Anon / publishable key</label>
          <textarea className="text-area" rows={3} value={key} placeholder="sb_publishable_… or eyJhbGciOi…"
            autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false}
            onChange={e => setKey(e.target.value)} />

          {err && <p className="sub landing-msg" style={{ color: 'var(--danger)' }}>{err}</p>}

          <button className="btn btn-primary btn-lg landing-submit" disabled={!url.trim() || !key.trim()} onClick={save}>
            Connect
          </button>

          <button className="landing-toggle" onClick={onUseLocal}>
            Skip — use this device only (no account, no backup)
          </button>
        </section>
      </div>
    </div>
  );
}
