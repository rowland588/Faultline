/** Check a network-only build manifest before touching the running app. IndexedDB and offline caches stay intact. */
export type UpdateResult = 'current' | 'reloading';
let checking: Promise<UpdateResult> | undefined;

function activate(worker: ServiceWorker): Promise<void> {
  return new Promise((resolve, reject) => {
    const finish = (error?: Error) => { clearTimeout(timer); worker.removeEventListener('statechange', changed); if (error) reject(error); else resolve(); };
    const changed = () => {
      if (worker.state === 'installed') worker.postMessage({ type: 'SKIP_WAITING' });
      if (worker.state === 'activated') finish();
      if (worker.state === 'redundant') finish(new Error('The new version could not be installed. Try again.'));
    };
    const timer = setTimeout(() => finish(new Error('The update is taking longer than expected. Try again when your connection is stable.')), 60_000);
    worker.addEventListener('statechange', changed); changed();
  });
}

async function check(): Promise<UpdateResult> {
  if (!navigator.onLine) throw new Error('You are offline. Connect to the internet to check for updates.');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  let latest: { id?: string };
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}version.json?check=${Date.now()}`, { cache: 'no-store', signal: controller.signal });
    if (!response.ok) throw new Error('Version unavailable');
    latest = await response.json();
    if (!latest.id || typeof latest.id !== 'string') throw new Error('Version unavailable');
  } catch { throw new Error('Could not check for updates. Your current version and saved work are still available. Try again.'); }
  finally { clearTimeout(timeout); }
  if (latest.id === __BUILD_ID__) return 'current';
  const reg = await navigator.serviceWorker?.getRegistration(import.meta.env.BASE_URL);
  if (reg) {
    try {
      await reg.update();
      const worker = reg.installing || reg.waiting;
      if (worker) await activate(worker);
    } catch { throw new Error('The new version could not be downloaded. Your current version is still available. Try again.'); }
  }
  location.reload();
  return 'reloading';
}

export function updateNow(): Promise<UpdateResult> {
  if (!checking) checking = check().finally(() => { checking = undefined; });
  return checking;
}
