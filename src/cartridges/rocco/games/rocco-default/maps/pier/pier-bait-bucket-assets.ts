export const pierBaitBucketAssetUrls = {
  normal: new URL('assets/bait-bucket/normal.png', import.meta.url).href,
  dropped: new URL('assets/bait-bucket/dropped.png', import.meta.url).href,
} as const;

export const pierBaitBucketKickSoundUrl = new URL('assets/bait-bucket-kick.mp3', import.meta.url)
  .href;
