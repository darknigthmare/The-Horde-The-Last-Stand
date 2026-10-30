/* 0.44.2 — Every route shares the after-action report and preparation retry. */

function dl442OfferDefeatRetry(checkpoint) {
  // This is the exact preparation captured by the native departure flow. It is
  // never rebuilt from a starting kit and never merged with another route.
  v21DefeatCheckpoint = checkpoint;
  if (!checkpoint) return;
  const body = $('dialogBody'), buttons = body?.querySelector('.buttons');
  if (!buttons || $('v21RetryNight')) return;
  const button = document.createElement('button');
  button.id = 'v21RetryNight';
  button.className = 'primary';
  button.textContent = 'REPRENDRE LA PRÉPARATION';
  button.onclick = v21RestoreDefeatCheckpoint;
  buttons.prepend(button);
  const notice = document.createElement('div');
  notice.className = 'notice';
  notice.textContent = 'Point de reprise disponible : retour au budget, aux munitions et aux consommables de la préparation avant départ. La progression de profil déjà acquise reste conservée.';
  const paragraph = body.querySelector('p');
  if (paragraph) paragraph.after(notice);
  else buttons.before(notice);
}

// The later Highway, Water, Tower and Dark handlers return before the older
// telemetry/retry wrappers. Reconcile their common aftermath at the outer edge,
// while retaining each route's native defeat screen and settlement rules.
const dl442EndRunPrior = endRun;
endRun = function(victory) {
  const endedRun = run, endedWave = wave;
  const checkpoint = !victory && !practiceSession && endedWave?.v21RetryCheckpoint
    ? clone(endedWave.v21RetryCheckpoint) : null;
  const out = dl442EndRunPrior(victory);
  if (victory || phase !== 'defeat' || practiceSession || run !== endedRun || wave !== endedWave) return out;
  // The native recorded flag makes this a no-op for routes already handled by
  // the older wrapper. Repeated end notifications cannot add a second report.
  const session = v21CommitSession('defeat');
  if (session) v21InjectDialogReport(session);
  dl442OfferDefeatRetry(checkpoint);
  return out;
};

queueMicrotask(() => {
  if (window.__DL) window.__DL.endRun = endRun;
});
