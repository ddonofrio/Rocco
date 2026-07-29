export const roccoFinalScreenMusicUri = `${import.meta.env.BASE_URL}cartridges/rocco/music/end-music.mp3`;

export interface RoccoFinalScreenImageAsset {
  id: string;
  filename: string;
  uri: string;
  width: number;
  height: number;
}

export const roccoFinalScreenImageAssets: readonly RoccoFinalScreenImageAsset[] = [
  {
    id: 'rocco-final-image-guysprite',
    filename: 'Rocco & Guysprite.png',
    uri: new URL('assets/end-images/Rocco & Guysprite.png', import.meta.url).href,
    width: 1254,
    height: 1254,
  },
  {
    id: 'rocco-final-image-pelikan',
    filename: 'Rocco & Pelikan.png',
    uri: new URL('assets/end-images/Rocco & Pelikan.png', import.meta.url).href,
    width: 1122,
    height: 1402,
  },
  {
    id: 'rocco-final-image-stan',
    filename: 'Rocco & Stan.png',
    uri: new URL('assets/end-images/Rocco & Stan.png', import.meta.url).href,
    width: 1254,
    height: 1254,
  },
  {
    id: 'rocco-final-image-film-day',
    filename: 'Rocco Film day at shop.png',
    uri: new URL('assets/end-images/Rocco Film day at shop.png', import.meta.url).href,
    width: 1086,
    height: 1448,
  },
] as const;
