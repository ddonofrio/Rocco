export const guyspriteRunLeftAssetUrls = [
  new URL('assets/run-left-1.png', import.meta.url).href,
  new URL('assets/run-left-2.png', import.meta.url).href,
] as const;

export const guyspriteRunRightAssetUrls = [
  new URL('assets/run-right-1.png', import.meta.url).href,
  new URL('assets/run-right-2.png', import.meta.url).href,
] as const;

export const guyspriteStandingAssetUrls = {
  down: new URL('assets/stand-down.png', import.meta.url).href,
  'down-left': new URL('assets/stand-down-left.png', import.meta.url).href,
  left: new URL('assets/stand-left.png', import.meta.url).href,
  'up-left': new URL('assets/stand-up-left.png', import.meta.url).href,
  up: new URL('assets/stand-up.png', import.meta.url).href,
  'up-right': new URL('assets/stand-up-right.png', import.meta.url).href,
  right: new URL('assets/stand-right.png', import.meta.url).href,
  'down-right': new URL('assets/stand-down-right.png', import.meta.url).href,
} as const;

export const guyspriteTypingAssetUrls = [
  new URL('assets/typing-1.png', import.meta.url).href,
  new URL('assets/typing-2.png', import.meta.url).href,
  new URL('assets/typing-3.png', import.meta.url).href,
] as const;
