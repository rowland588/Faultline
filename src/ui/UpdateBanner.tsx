/* "A new version is ready."
 *
 * This app is an installed PWA: the service worker precaches the shell, so a
 * page that is already open keeps running the JavaScript it booted with long
 * after a new build has shipped. The worker takes over silently
 * (skipWaiting + clientsClaim), which means a new version can be sitting on the
 * device while the screen still shows the old one — indistinguishable, from the
 * outside, from a deploy that never happened.
 *
 * So say it out loud. Reloading is still the user's call — nothing yanks them
 * off a screen mid-task — but the choice is now visible instead of hidden
 * behind a "check for update" link at the bottom of Home. */
import { useEffect, useState } from 'react';

export function UpdateBanner() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    // On a FIRST visit there is no controller until clientsClaim installs one,
    // and that also fires controllerchange. Announcing "a new version" to
    // someone who just opened the app for the first time is a lie, so only a
    // page that was ALREADY controlled can be superseded.
    const wasControlled = !!navigator.serviceWorker.controller;

    // Fires when a newly installed worker takes control of this page — i.e. the
    // assets behind us just changed under our feet.
    const onControllerChange = () => { if (wasControlled) setReady(true); };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    // Also catch the case where the worker updates while we watch it install.
    let reg: ServiceWorkerRegistration | undefined;
    void navigator.serviceWorker.getRegistration().then(r => {
      reg = r;
      if (!r) return;
      if (r.waiting && wasControlled) setReady(true);
      r.addEventListener('updatefound', () => {
        const sw = r.installing;
        if (!sw) return;
        sw.addEventListener('statechange', () => {
          if (sw.state === 'installed' && wasControlled) setReady(true);
        });
      });
    });

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      void reg; // registration listeners die with the registration
    };
  }, []);

  if (!ready) return null;

  return (
    <div className="upd" role="status">
      <span className="upd-txt">A new version of Faultline is ready.</span>
      <button className="upd-btn" onClick={() => location.reload()}>Reload</button>
      <button className="upd-x" onClick={() => setReady(false)} aria-label="Dismiss">×</button>
    </div>
  );
}
