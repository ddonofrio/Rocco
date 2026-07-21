export interface RoccoSharedSoundAsset {
  id: string;
  uri: string;
  volume: number;
  loop: boolean;
  preloadFailureMessage: string;
}

export interface RoccoSharedAssetManifest {
  imageUrls: readonly string[];
  sounds: readonly RoccoSharedSoundAsset[];
}
