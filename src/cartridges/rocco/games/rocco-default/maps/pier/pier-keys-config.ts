import { PIER_PELIKAN_CONFIG } from './pier-pelikan-config';

export const PIER_KEYS_CONFIG = {
  spriteDefinitionId: 'rocco-keys-sprite',
  spriteInstanceId: 'rocco-keys-main',
  animationId: 'keys-idle',
  spriteWidth: 300,
  spriteHeight: 400,
  spriteScale: 0.12,
  presentationPitchDegrees: 45,
  x: PIER_PELIKAN_CONFIG.perchX - 10,
  y: PIER_PELIKAN_CONFIG.perchY + 20,
  pivotX: 150,
  pivotY: 365,
  renderLayer: 'foreground',
  zIndex: 95,
} as const;
