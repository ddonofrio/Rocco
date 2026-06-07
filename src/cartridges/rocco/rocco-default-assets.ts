export const roccoDefaultRunLeftAssetUrls = [
  new URL('./assets/characters/rocco/run-left-1.png', import.meta.url).href,
  new URL('./assets/characters/rocco/run-left-2.png', import.meta.url).href,
] as const;

export const roccoDefaultRunRightAssetUrls = [
  new URL('./assets/characters/rocco/run-right-1.png', import.meta.url).href,
  new URL('./assets/characters/rocco/run-right-2.png', import.meta.url).href,
] as const;

export const roccoDefaultPickUpAssetUrl = new URL('./assets/characters/rocco/pick-up.png', import.meta.url).href;

export const roccoDefaultPelikanAssetUrls = [
  new URL('./assets/characters/pelikan/idle-1.png', import.meta.url).href,
  new URL('./assets/characters/pelikan/idle-2.png', import.meta.url).href,
  new URL('./assets/characters/pelikan/idle-3.png', import.meta.url).href,
  new URL('./assets/characters/pelikan/idle-4.png', import.meta.url).href,
] as const;

export const roccoDefaultPelikanFlightAssetUrl = new URL('./assets/characters/pelikan/flight.png', import.meta.url).href;

export const roccoDefaultPelikanFeedingAssetUrl = new URL('./assets/characters/pelikan/feeding.png', import.meta.url).href;

export const roccoDefaultPelikanFlyingSoundUrl = new URL('./assets/characters/pelikan/flying.mp3', import.meta.url).href;

export const roccoDefaultYouLoseSoundUrl = new URL('./assets/sounds/you-lose.mp3', import.meta.url).href;

export const roccoDefaultBaitBucketAssetUrls = {
  normal: new URL('./assets/props/bait-bucket/normal.png', import.meta.url).href,
  dropped: new URL('./assets/props/bait-bucket/dropped.png', import.meta.url).href,
} as const;

export const roccoDefaultKeysAssetUrl = new URL('./assets/props/keys/keys.png', import.meta.url).href;

export const roccoDefaultKeysSoundUrl = new URL('./assets/props/keys/keys.mp3', import.meta.url).href;

export const roccoDefaultTwentyEurosAssetUrl = new URL(
  './assets/props/money/20-euros.png',
  import.meta.url,
).href;

export const roccoDefaultActionMenuAssetUrls = {
  grab: new URL('./assets/actions/grab.png', import.meta.url).href,
  inventory: new URL('./assets/actions/inventory.png', import.meta.url).href,
  kick: new URL('./assets/actions/kick.png', import.meta.url).href,
  look: new URL('./assets/actions/look.png', import.meta.url).href,
  talk: new URL('./assets/actions/talk.png', import.meta.url).href,
} as const;

export const roccoDefaultStandingAssetUrls = {
  down: new URL('./assets/characters/rocco/stand-down.png', import.meta.url).href,
  'down-left': new URL('./assets/characters/rocco/stand-down-left.png', import.meta.url).href,
  left: new URL('./assets/characters/rocco/stand-left.png', import.meta.url).href,
  'up-left': new URL('./assets/characters/rocco/stand-up-left.png', import.meta.url).href,
  up: new URL('./assets/characters/rocco/stand-up.png', import.meta.url).href,
  'up-right': new URL('./assets/characters/rocco/stand-up-right.png', import.meta.url).href,
  right: new URL('./assets/characters/rocco/stand-right.png', import.meta.url).href,
  'down-right': new URL('./assets/characters/rocco/stand-down-right.png', import.meta.url).href,
} as const;
