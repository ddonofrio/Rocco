import type { RoccoSpriteDefinition } from '../../../../../../console/video/sprites';
import type { RoccoLocalization } from '../../../../localization';
import { createRoccoLocalization } from '../../../../localization';
import { GUYSPRITE_CONFIG } from './guysprite-config';
import { guyspriteTypingAssetUrls } from './guysprite-assets';

export const GUYSPRITE_TYPING_DEFINITION_ID = 'guysprite-threepwood-typing-sprite';
export const GUYSPRITE_TYPING_ANIMATION_ID = 'typing';

const GUYSPRITE_TYPING_FRAMES = [
  { id: 'guysprite-typing-frame-1', imageId: 'guysprite-typing-image-1', width: 207, height: 281 },
  { id: 'guysprite-typing-frame-2', imageId: 'guysprite-typing-image-2', width: 302, height: 413 },
  { id: 'guysprite-typing-frame-3', imageId: 'guysprite-typing-image-3', width: 207, height: 281 },
] as const;

export function createGuyspriteTypingSpriteDefinition(
  localization: RoccoLocalization = createRoccoLocalization(),
): RoccoSpriteDefinition {
  return {
    id: GUYSPRITE_TYPING_DEFINITION_ID,
    name: 'Guysprite Threepwood typing',
    images: guyspriteTypingAssetUrls.map((uri, index) => ({
      id: `guysprite-typing-image-${index + 1}`,
      uri,
      width: GUYSPRITE_TYPING_FRAMES[index].width,
      height: GUYSPRITE_TYPING_FRAMES[index].height,
    })),
    frames: GUYSPRITE_TYPING_FRAMES.map(({ id, imageId }) => ({ id, imageId })),
    animations: {
      [GUYSPRITE_TYPING_ANIMATION_ID]: {
        id: GUYSPRITE_TYPING_ANIMATION_ID,
        loop: true,
        playbackRate: 1,
        frames: GUYSPRITE_TYPING_FRAMES.map(({ id }) => ({ frameId: id, durationMs: 1 })),
      },
    },
    defaultAnimation: GUYSPRITE_TYPING_ANIMATION_ID,
    render: {
      renderLayer: 'world.actors',
      zIndex: 50,
      depthMode: 'fixed',
      opacity: 1,
    },
    visibleDescription: {
      enabled: true,
      text: localization.text.descriptions.guysprite,
    },
    metadata: {
      purpose: 'guysprite-threepwood-typing-at-reset-console',
      baseScale: GUYSPRITE_CONFIG.motion.scale,
    },
  };
}
