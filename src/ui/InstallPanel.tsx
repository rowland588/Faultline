/* "Add to phone" — a PWA install has no reliable browser-chrome affordance on
 * its own (iOS Safari never shows one at all; Chrome only offers its native
 * banner once its own engagement heuristics are satisfied), so the app has to
 * offer the action itself or it's effectively undiscoverable on a phone. */
import { useEffect, useState } from 'react';
import { Sheet } from './Sheet';

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
    || (navigator as unknown as { standalone?: boolean }).standalone === true;
}
function isIOS(): boolean {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);
}

export function InstallPanel() {
  const [installed, setInstalled] = useState(isStandalone());
  const [deferred, setDeferred] = useState<InstallPromptEvent | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (installed) return;
    const onPrompt = (e: Event) => { e.preventDefault(); setDeferred(e as InstallPromptEvent); };
    const onInstalled = () => { setInstalled(true); setDeferred(null); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, [installed]);

  const ios = isIOS();
  if (installed || (!ios && !deferred)) return null; // nothing this device can act on yet

  const go = async () => {
    if (deferred) {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      if (outcome === 'accepted') setInstalled(true);
      setDeferred(null);
    } else {
      setOpen(true); // iOS has no programmatic install — show the manual steps
    }
  };

  return (
    <>
      <button className="cloud-row" onClick={() => void go()}>
        <span className="cloud-ic" aria-hidden>⇩</span>
        <span className="cloud-main"><b>Add to phone</b><span className="sub">install Faultline like an app — opens from your home screen, works offline</span></span>
        <span className="cloud-go" aria-hidden>›</span>
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Add to your home screen">
        <p className="sub" style={{ marginBottom: 12 }}>iOS doesn't let a site trigger this itself — three taps in Safari:</p>
        <ol style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 8 }}>
          <li>Tap the <b>Share</b> icon in the toolbar</li>
          <li>Scroll down and tap <b>Add to Home Screen</b></li>
          <li>Tap <b>Add</b> — Faultline now opens like any other app</li>
        </ol>
      </Sheet>
    </>
  );
}
