export interface RoccoSharedImageAssetGroup {
  name: string;
  urls: readonly string[];
  preloadFailureMessage: string;
}

export interface RoccoSharedSoundAsset {
  id: string;
  uri: string;
  volume: number;
  loop: boolean;
  preloadFailureMessage: string;
}

export interface RoccoSharedAssetManifest {
  imageGroups: readonly RoccoSharedImageAssetGroup[];
  sounds: readonly RoccoSharedSoundAsset[];
}
