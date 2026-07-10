export interface RoccoSoundProfile {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
}

export const defaultSoundProfile: RoccoSoundProfile = {
  masterVolume: 1,
  musicVolume: 1,
  sfxVolume: 1,
};

function clampVolume(value: number): number {
  if (!Number.isFinite(value)) {
    return 1;
  }

  return Math.max(0, Math.min(1, value));
}

export function resolveRoccoSoundProfile(
  profile: Partial<RoccoSoundProfile> = {},
): RoccoSoundProfile {
  return {
    masterVolume: clampVolume(profile.masterVolume ?? defaultSoundProfile.masterVolume),
    musicVolume: clampVolume(profile.musicVolume ?? defaultSoundProfile.musicVolume),
    sfxVolume: clampVolume(profile.sfxVolume ?? defaultSoundProfile.sfxVolume),
  };
}

export function getEffectiveMusicVolume(profile: RoccoSoundProfile): number {
  return clampVolume(profile.masterVolume * profile.musicVolume);
}

export function getEffectiveSfxVolume(profile: RoccoSoundProfile): number {
  return clampVolume(profile.masterVolume * profile.sfxVolume);
}

export function setEffectiveMusicVolume(
  profile: RoccoSoundProfile,
  effectiveVolume: number,
): RoccoSoundProfile {
  return setEffectiveChannelVolume(profile, 'musicVolume', effectiveVolume);
}

export function setEffectiveSfxVolume(
  profile: RoccoSoundProfile,
  effectiveVolume: number,
): RoccoSoundProfile {
  return setEffectiveChannelVolume(profile, 'sfxVolume', effectiveVolume);
}

function setEffectiveChannelVolume(
  profile: RoccoSoundProfile,
  channel: 'musicVolume' | 'sfxVolume',
  effectiveVolume: number,
): RoccoSoundProfile {
  const resolved = resolveRoccoSoundProfile(profile);
  const desiredVolume = clampVolume(effectiveVolume);

  if (desiredVolume <= 0) {
    return {
      ...resolved,
      [channel]: 0,
    };
  }

  if (desiredVolume <= resolved.masterVolume && resolved.masterVolume > 0) {
    return {
      ...resolved,
      [channel]: clampVolume(desiredVolume / resolved.masterVolume),
    };
  }

  return {
    ...resolved,
    masterVolume: desiredVolume,
    [channel]: 1,
  };
}
