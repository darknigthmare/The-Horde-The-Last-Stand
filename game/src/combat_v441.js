/* 0.44.1 — Special attacks obey the same control effects as ordinary enemies. */
function dl441EnemyCanAct(z) {
  return !!z && !z.dead && !(z.stun > 0) && !distracted(z);
}

// The field guide promises that control cancels this announced lane change.
// Clearing only the warning would immediately start another jump after release;
// restore its normal cooldown so the next attempt has its own visible warning.
function dl441CancelRoadJump(z) {
  if (!z || z.dead || z.type !== 'roadJumper' || !z.road || z.road.warn <= 0) return;
  if (!(z.stun > 0) && !distracted(z)) return;
  z.road.warn = 0;
  z.road.jump = 6;
}
