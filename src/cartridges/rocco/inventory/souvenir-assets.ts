export const SOUVENIR_TABLE_ASSET_URLS = {
  amberSpiral: new URL('assets/souvenirs/amber-spiral.png', import.meta.url).href,
  amberStar: new URL('assets/souvenirs/amber-star.png', import.meta.url).href,
  amberTurritella: new URL('assets/souvenirs/amber-turritella.png', import.meta.url).href,
  beachNecklace: new URL('assets/souvenirs/beach-necklace.png', import.meta.url).href,
  copperFan: new URL('assets/souvenirs/copper-fan.png', import.meta.url).href,
  goldenNautilus: new URL('assets/souvenirs/golden-nautilus.png', import.meta.url).href,
  goldenScallop: new URL('assets/souvenirs/golden-scallop.png', import.meta.url).href,
  hollowUrchin: new URL('assets/souvenirs/hollow-urchin.png', import.meta.url).href,
  horseshoeCrab: new URL('assets/souvenirs/horseshoe-crab.png', import.meta.url).href,
  japaneseFloat: new URL('assets/souvenirs/japanese-float.png', import.meta.url).href,
  razorShell: new URL('assets/souvenirs/razor-shell.png', import.meta.url).href,
  redCoral: new URL('assets/souvenirs/red-coral.png', import.meta.url).href,
  seaDollar: new URL('assets/souvenirs/sea-dollar.png', import.meta.url).href,
  speckledCowrie: new URL('assets/souvenirs/speckled-cowrie.png', import.meta.url).href,
  spinyMurex: new URL('assets/souvenirs/spiny-murex.png', import.meta.url).href,
  stripedClam: new URL('assets/souvenirs/striped-clam.png', import.meta.url).href,
  stripedUrchin: new URL('assets/souvenirs/striped-urchin.png', import.meta.url).href,
  tigerCone: new URL('assets/souvenirs/tiger-cone.png', import.meta.url).href,
  towerShell: new URL('assets/souvenirs/tower-shell.png', import.meta.url).href,
} as const;

export const ROCCO_SOUVENIR_TABLE_ITEM_IMAGE_URLS: readonly string[] =
  Object.values(SOUVENIR_TABLE_ASSET_URLS);
