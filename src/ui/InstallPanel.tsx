import { useId, useState, useSyncExternalStore } from 'react';
import { installState, requestInstall, subscribeToInstall } from '../lib/appInstall';
import { Icon } from './Icon';

function InstallInstructions() {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1))
    return <>In Safari, tap <b>Share</b>, then <b>Add to Home Screen</b> and <b>Add</b>.</>;
  if (/Android/.test(ua))
    return <>Open this page in a regular Chrome tab. Tap <b>⋮</b>, then <b>Install app</b> or <b>Add to Home screen → Install</b>.</>;
  if (/Edg\//.test(ua))
    return <>Open the Edge menu <b>…</b>, find <b>Apps</b> and choose <b>Install Faultline</b> or <b>Install this site as an app</b>.</>;
  if (/Chrome\//.test(ua))
    return <>In Chrome, open <b>⋮ → Cast, save and share → Install page as app</b>.</>;
  if (/Macintosh/.test(ua) && /Version\/\d+.*Safari\//.test(ua))
    return <>In Safari on macOS Sonoma or later, choose <b>File → Add to Dock</b>. On older Macs, open this page in Chrome or Edge to install.</>;
  return <>Open this page in a regular Chrome or Edge window and use the install option in the address bar or browser menu.</>;
}

export function InstallPanel({ landing = false }: { landing?: boolean }) {
  const state = useSyncExternalStore(subscribeToInstall, installState);
  const [showHelp, setShowHelp] = useState(false);
  const helpId = useId();
  if (state === 'installed') return null;

  function install() {
    if (state === 'browser') { setShowHelp(shown => !shown); return; }
    setShowHelp(false);
    void requestInstall().then(result => { if (result === 'instructions') setShowHelp(true); });
  }

  return <>
    <button type="button" className={landing ? 'door-link install-app' : 'sheet-row'} onClick={install}
      disabled={state === 'prompting'} aria-expanded={state === 'browser' ? showHelp : undefined} aria-controls={showHelp ? helpId : undefined}>
      <span><Icon name="download" size="1em" /> Install Faultline</span>
    </button>
    {showHelp && <p id={helpId} className="install-instructions" role="status"><InstallInstructions /></p>}
  </>;
}
