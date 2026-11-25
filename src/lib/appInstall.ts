type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

let offer: InstallEvent | undefined;
let prompting = false;
let installed = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach(listener => listener());

export function subscribeToInstall(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function installState() {
  if (installed || window.matchMedia?.('(display-mode: standalone)')?.matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone) return 'installed';
  if (prompting) return 'prompting';
  return offer ? 'ready' : 'browser';
}

/** The offer belongs to this document. Keep it when the user signs in or changes pages. */
export function captureInstallOffer() {
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    offer = event as InstallEvent;
    installed = false;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    installed = true;
    offer = undefined;
    notify();
  });
  window.matchMedia?.('(display-mode: standalone)')?.addEventListener?.('change', notify);
}

export async function requestInstall(): Promise<'handled' | 'instructions'> {
  const state = installState();
  if (state === 'prompting' || state === 'installed') return 'handled';
  const current = offer;
  if (!current) return 'instructions';
  // A native prompt can only be used once and must be called within the click.
  offer = undefined;
  prompting = true;
  notify();
  try {
    await current.prompt();
    if ((await current.userChoice).outcome === 'accepted') installed = true;
    return 'handled';
  } catch {
    return 'instructions';
  } finally {
    prompting = false;
    notify();
  }
}
