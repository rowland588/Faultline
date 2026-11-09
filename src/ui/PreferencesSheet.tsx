/* HOW I WORK — what AI Mode's colleague is always told about you (8 November, docs/AI-MODE.md, Memory; lib/preferences).
 * Opened from the account menu and from AI Mode's More ▾: four boxes in your own words — the words you use, how you like to
 * work, how you like a report, anything to always remember. Saved once, it goes with every question you ask in AI Mode, and
 * the colleague adds a line here only when you say yes to its card. Manual Mode never reads it. */
import { useState } from 'react';
import { PREFERENCES_MAX, PREFERENCE_FIELDS, readPreferences, savePreferences, type PreferenceKey, type Preferences } from '../lib/preferences';
import { Sheet } from './Sheet';

export function PreferencesSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const have = readPreferences();
  const [p, setP] = useState<Preferences>(have ?? {});
  const [said, setSaid] = useState('');
  const [busy, setBusy] = useState(false);
  const used = PREFERENCE_FIELDS.reduce((n, f) => n + (p[f.key]?.trim().length ?? 0), 0);
  const over = used > PREFERENCES_MAX;
  const put = (k: PreferenceKey, v: string) => setP(x => ({ ...x, [k]: v }));
  const save = async () => {
    setBusy(true);
    const r = await savePreferences(p);
    setBusy(false);
    setSaid(r.ok ? 'Saved — AI Mode reads it with every question from now.' : r.why);
    if (r.ok) window.setTimeout(onClose, 900);
  };
  return (
    <Sheet open={open} onClose={onClose} title="How I work">
      <div className="prefs-sheet" data-prefs-sheet>
        <p className="sub">In your own words, what Luna, Faultline’s AI colleague, should always know about how you work. It goes with every question you ask there; nothing else reads it. {have ? 'Change it any time.' : 'Nothing is sent until you save it.'}</p>
        {PREFERENCE_FIELDS.map(f => (
          <label key={f.key} className="field">
            <span className="field-label">{f.label}</span>
            <textarea className="text-input prefs-box" rows={3} value={p[f.key] ?? ''} placeholder={f.hint} aria-label={f.label}
              onChange={e => put(f.key, e.target.value)} />
          </label>
        ))}
        <p className={`sub prefs-count${over ? ' prefs-over' : ''}`} aria-live="polite">{used.toLocaleString('en-GB')} of {PREFERENCES_MAX.toLocaleString('en-GB')} characters{over ? ' — shorten a box to save' : ''}</p>
        <div className="sheet-acts">
          <button type="button" className="btn btn-primary" disabled={busy || over} onClick={() => void save()}>Save</button>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
        </div>
        {said && <p className="sub" role="status">{said}</p>}
      </div>
    </Sheet>
  );
}
