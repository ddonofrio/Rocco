import type { RoccoDialogueSession } from '../../../../rpce/dialogue';
import type { RoccoLocalization } from '../../localization';
import { NETHER_OFFICE_GUYSPRITE_MESSAGE_STYLE } from './nether-office-guysprite-interaction';

const IDENTITY_DIALOGUE_TTL_MS = 5200;

export function startNetherOfficeIdentityFoolSequence(
  dialogue: RoccoDialogueSession | undefined,
  text: RoccoLocalization['text']['nether']['officeReading'],
  onComplete: () => void,
): void {
  dialogue?.beginLinearSequence({
    speaker: 'npc',
    lines: [text.identityFoolGuyspriteLine],
    lineTtlMs: IDENTITY_DIALOGUE_TTL_MS,
    messageOptions: { style: NETHER_OFFICE_GUYSPRITE_MESSAGE_STYLE },
    onComplete: () => {
      dialogue?.beginLinearSequence({
        speaker: 'player',
        lines: [text.identityFoolRoccoLine],
        lineTtlMs: IDENTITY_DIALOGUE_TTL_MS,
        onComplete: () => {
          dialogue?.beginLinearSequence({
            speaker: 'npc',
            lines: [text.identityFoolFinalLine],
            lineTtlMs: IDENTITY_DIALOGUE_TTL_MS,
            messageOptions: { style: NETHER_OFFICE_GUYSPRITE_MESSAGE_STYLE },
            onComplete,
          });
        },
      });
    },
  });
}
