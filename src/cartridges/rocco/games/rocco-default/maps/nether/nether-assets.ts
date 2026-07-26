export const netherConsoleHardwareSpawnAssetUrls = {
  background: new URL('assets/console-hardware-spawn-background.png', import.meta.url).href,
  lights: new URL('assets/console-hardware-spawn-lights.png', import.meta.url).href,
  walkPath: new URL('assets/console-hardware-spawn-walkpath.png', import.meta.url).href,
} as const;

export const netherEndOfHallwayDoorAssetUrls = {
  background: new URL('assets/end-of-hallway-door-background.png', import.meta.url).href,
  lights: new URL('assets/end-of-hallway-door-lights.png', import.meta.url).href,
  walkPath: new URL('assets/end-of-hallway-door-walkpath.png', import.meta.url).href,
} as const;

export const netherResetOfficeAssetUrls = {
  background: new URL('assets/reset-office-1.png', import.meta.url).href,
  walkPath: new URL('assets/reset-office-1-walkpath.png', import.meta.url).href,
  openDoor: new URL('assets/reset-office-door-open.png', import.meta.url).href,
} as const;

export const netherResetOfficeSecondAssetUrls = {
  background: new URL('assets/reset-office-2.png', import.meta.url).href,
  walkPath: new URL('assets/reset-office-2-walkpath.png', import.meta.url).href,
  deskChair: new URL('assets/reset-office-2-desk-chair.png', import.meta.url).href,
  printerFront: new URL('assets/printer-front.png', import.meta.url).href,
} as const;

export const netherAmbientSteamMachineAssetUrl = new URL(
  'assets/steam_machine.mp3',
  import.meta.url,
).href;
