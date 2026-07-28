import type { CartridgeSdkV1Runtime } from '../../../../../../console/cartridges/sdk-v1';
import { netherOfficeConfidenceSoundUrls } from './nether-assets';
import { netherYouLoseSoundUrl } from './nether-security-camera-assets';

export const NETHER_OFFICE_CONFIDENCE_GAIN_SOUND_ID = 'rocco-nether-office-confidence-gain';
export const NETHER_OFFICE_CONFIDENCE_LOSS_SOUND_ID = 'rocco-nether-office-confidence-loss';
export const NETHER_OFFICE_PATIENCE_DEFEAT_SOUND_ID = 'rocco-nether-office-patience-defeat-sound';
export const NETHER_OFFICE_PATIENCE_DEFEAT_SOUND_VOLUME = 0.25;

export function registerNetherOfficePatienceSounds(engine: CartridgeSdkV1Runtime): void {
  engine.audio.registerSound({
    id: NETHER_OFFICE_CONFIDENCE_GAIN_SOUND_ID,
    uri: netherOfficeConfidenceSoundUrls.gain,
    volume: 0.45,
    loop: false,
  });
  engine.audio.registerSound({
    id: NETHER_OFFICE_CONFIDENCE_LOSS_SOUND_ID,
    uri: netherOfficeConfidenceSoundUrls.lose,
    volume: 0.45,
    loop: false,
  });
  engine.audio.registerSound({
    id: NETHER_OFFICE_PATIENCE_DEFEAT_SOUND_ID,
    uri: netherYouLoseSoundUrl,
    volume: NETHER_OFFICE_PATIENCE_DEFEAT_SOUND_VOLUME,
    loop: false,
  });
}

export function unregisterNetherOfficePatienceSounds(engine: CartridgeSdkV1Runtime): void {
  engine.audio.stopSound(NETHER_OFFICE_CONFIDENCE_GAIN_SOUND_ID);
  engine.audio.stopSound(NETHER_OFFICE_CONFIDENCE_LOSS_SOUND_ID);
  engine.audio.stopSound(NETHER_OFFICE_PATIENCE_DEFEAT_SOUND_ID);
  engine.audio.unregisterSound(NETHER_OFFICE_CONFIDENCE_GAIN_SOUND_ID);
  engine.audio.unregisterSound(NETHER_OFFICE_CONFIDENCE_LOSS_SOUND_ID);
  engine.audio.unregisterSound(NETHER_OFFICE_PATIENCE_DEFEAT_SOUND_ID);
}
