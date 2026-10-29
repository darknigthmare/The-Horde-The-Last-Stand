/* 0.44.2 — Profile previews describe all independent preparations.
   Read-only presentation; validation, confirmation and storage guards stay native. */
function dl442ProfilePreparations(profile) {
  return V33_CHECKPOINT_KEYS.map(key => profile?.[key]).filter(Boolean);
}

const dl442StageImportPrior = stageImport;
stageImport = function(text, source = 'fichier') {
  const result = dl442StageImportPrior(text, source);
  if (!result || phase !== 'saveConfirm') return result;
  const candidate = decodeSave(text), stats = $('dialogBody').querySelector('.save-stats');
  if (!stats) return result;
  const preparations = dl442ProfilePreparations(candidate);
  stats.textContent = 'Rang ' + rankOf(candidate.meta.xp) + ' · ' + fmt(candidate.meta.xp) + ' XP';
  if (preparations.length) {
    const list = document.createElement('dl');
    list.className = 'dl442-profile-list';
    for (const preparation of preparations) {
      const item = document.createElement('div');
      item.className = 'dl442-profile-row';
      const label = document.createElement('dt'), budget = document.createElement('dd');
      label.textContent = checkpointLabel(preparation);
      budget.textContent = fmt(preparation.cash) + ' CR';
      item.append(label, budget);
      list.appendChild(item);
    }
    stats.appendChild(list);
  } else {
    const empty = document.createElement('p');
    empty.textContent = 'Aucune préparation enregistrée.';
    stats.appendChild(empty);
  }
  return result;
};

queueMicrotask(() => {
  if (window.__DL) window.__DL.stageImport = stageImport;
});
