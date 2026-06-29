import type { RoccoDialogueChoiceNode } from '../../../dialogue';
import { dialogueBranch as branch, dialogueLeaf as leaf } from '../../dialogue-helpers';

export const spanishStanSleepingChoice: RoccoDialogueChoiceNode = branch(
  'ask-sleeping',
  'Perdone, ¿estaba dormido?',
  'Dormitando.',
  [
    branch('sleep-snore', 'Ronca usted.', 'Eso no era roncar. Era serruchar.', [
      leaf('sleep-snore-good', '¿Serruchar?', 'Mis ronquidos suenan como un serrucho.'),
      leaf('sleep-snore-loud', 'Se oían bastante.', 'La sabiduría hace eco.'),
      leaf(
        'sleep-snore-sorry',
        'Perdone por decirlo.',
        'Entonces diga algo halagador. Ya estoy despierto.',
      ),
      leaf(
        'sleep-snore-again',
        '¿Puede hacerlo otra vez?',
        'Págame primero. Las actuaciones en directo son premium.',
      ),
    ]),
    branch('sleep-bad-night', '¿Mala noche?', 'Mala década. La noche solo pasó por dentro.', [
      leaf('sleep-bad-night-coffee', '¿Necesita café?', 'Necesitar, sí. Fiármelo, no.'),
      leaf(
        'sleep-bad-night-home',
        '¿Nunca descansa en casa?',
        'En casa hay tareas. Esta silla tiene negación.',
      ),
      leaf(
        'sleep-bad-night-poetic',
        'Hace que el agotamiento suene poético.',
        'Eso es la edad. El cuerpo falla y la frase mejora.',
      ),
      leaf(
        'sleep-bad-night-same',
        'Yo también estoy cansado.',
        'Excelente. Podemos decepcionar al día en equipo.',
      ),
    ]),
    branch('sleep-dreaming', '¿Estaba soñando?', 'Solo con facturas persiguiéndome hacia el mar.', [
      leaf('sleep-dreaming-boats', '¿Facturas de barcos?', 'Las peores. Números flotantes.'),
      leaf(
        'sleep-dreaming-sea',
        '¿Por qué hacia el mar?',
        'Porque hasta mis pesadillas respetan la geografía local.',
      ),
      leaf('sleep-dreaming-escape', '¿Consiguió escapar?', 'Me desperté. Cuenta como empate.'),
      leaf(
        'sleep-dreaming-better',
        'Debería soñar cosas mejores.',
        'Tú deberías empezar por milagros más fáciles.',
      ),
    ]),
    branch(
      'sleep-leave',
      '¿Quiere que le deje en paz?',
      'Querer y necesitar son categorías de lujo.',
      [
        leaf(
          'sleep-leave-yes',
          'Entonces... ¿sí?',
          'Entonces... todavía no. Ya pagué el peaje de despertarme.',
        ),
        leaf('sleep-leave-company', 'Puedo hacerle compañía.', '¿Puedes hacer que salga barata?'),
        leaf(
          'sleep-leave-quiet',
          'Puedo quedarme aquí callado.',
          'Eso suena amenazante a su manera.',
        ),
        leaf(
          'sleep-leave-honest',
          'No soy muy buena compañía.',
          'Entonces por fin tenemos terreno común.',
        ),
      ],
    ),
  ],
);
