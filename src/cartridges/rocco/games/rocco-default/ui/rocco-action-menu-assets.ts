export const ROCCO_ACTION_MENU_ASSETS = {
  developerMode: new URL('assets/actions/developer-mode.svg', import.meta.url).href,
  grab: new URL('assets/actions/grab.png', import.meta.url).href,
  inventory: new URL('assets/actions/inventory.png', import.meta.url).href,
  kick: new URL('assets/actions/kick.png', import.meta.url).href,
  look: new URL('assets/actions/look.png', import.meta.url).href,
  talk: new URL('assets/actions/talk.png', import.meta.url).href,
  useWc: new URL('assets/actions/use-wc.png', import.meta.url).href,
} as const;

export const ROCCO_DEV_SPRITE_CYCLE_CURSOR_URL = new URL(
  'assets/actions/sprite-cycle-cursor.svg',
  import.meta.url,
).href;

export const ROCCO_ACTION_MENU_PRELOAD_URLS: readonly string[] = [
  ROCCO_ACTION_MENU_ASSETS.developerMode,
  ROCCO_ACTION_MENU_ASSETS.grab,
  ROCCO_ACTION_MENU_ASSETS.inventory,
  ROCCO_ACTION_MENU_ASSETS.kick,
  ROCCO_ACTION_MENU_ASSETS.look,
  ROCCO_ACTION_MENU_ASSETS.talk,
  ROCCO_ACTION_MENU_ASSETS.useWc,
];
