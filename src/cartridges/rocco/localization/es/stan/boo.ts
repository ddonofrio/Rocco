import type { RoccoDialogueChoiceNode } from '../../../dialogue';
import { dialogueBranch as branch, dialogueLeaf as leaf } from '../../dialogue-helpers';

export const spanishStanBooChoice: RoccoDialogueChoiceNode = branch(
  'boo',
  'Booo',
  'No hagas eso. Si eres un fantasma, coge número. ¿Qué quieres de verdad?',
  [
    branch(
      'boo-bathroom',
      'Tengo ganas de ir al baño. ¿Me permite usar el suyo?',
      'Ahora mismo estamos cerrados.',
      [
        leaf('boo-bathroom-where', '¿Y dónde puedo encontrar uno?', [
          'Cruza la calle.',
          'Donde empieza el muelle.',
        ]),
        leaf(
          'boo-bathroom-please',
          'Por favor, tengo que ir.',
          'Es que el mío está roto y hay riesgo de muerte.',
        ),
        leaf(
          'boo-bathroom-sea',
          '¿Le importa si lo hago en el mar?',
          'Mientras no te vea el culo.',
        ),
        leaf(
          'boo-bathroom-broken',
          '¿Desde cuándo está roto?',
          'Desde que un turista trató la tubería como si fuera un duelo.',
        ),
      ],
    ),
    branch('boo-sorry', 'Perdone. Mal chiste.', 'No era ni un chiste. Era vandalismo silábico.', [
      leaf(
        'boo-sorry-reflex',
        'Al menos sus reflejos funcionan.',
        'Y también mi capacidad de vetar clientes.',
      ),
      leaf(
        'boo-sorry-apology',
        'Me estoy disculpando.',
        'Bien. Sigue escalando hasta llegar a la dignidad.',
      ),
      leaf(
        'boo-sorry-nervous',
        'Me pongo raro cuando estoy nervioso.',
        'Entonces compra calma al por mayor.',
      ),
      leaf(
        'boo-sorry-friends',
        'Podríamos empezar de nuevo como amigos.',
        'No corramos hacia la ficción.',
      ),
    ]),
    branch(
      'boo-testing',
      'Estaba probando sus reflejos.',
      'Enhorabuena. Sigo detestando las sorpresas.',
      [
        leaf('boo-testing-fast', 'Ha sido rápido.', 'El miedo pesa menos que el café.'),
        leaf(
          'boo-testing-security',
          'Buena seguridad para una tienda.',
          'Mi mejor defensa es la decepción.',
        ),
        leaf(
          'boo-testing-robber',
          '¿Y si yo fuera un ladrón?',
          'Te señalaría la caja y dejaría que la realidad hiciera el resto.',
        ),
        leaf(
          'boo-testing-science',
          'Era por la ciencia.',
          'La ciencia merece mejor financiación y peores ayudantes.',
        ),
      ],
    ),
    branch('boo-lonely', 'Parecía usted solo.', 'Parecía dormido. Aprende las siluetas.', [
      leaf('boo-lonely-mean', 'Eso ha sonado duro.', 'Es porque lo he pulido.'),
      leaf(
        'boo-lonely-company',
        'Le estaba ofreciendo compañía.',
        'La compañía es más fácil de ofrecer que de aguantar.',
      ),
      leaf('boo-lonely-chair', 'La silla también parecía sola.', 'La silla entiende los límites.'),
      leaf(
        'boo-lonely-project',
        'Puede que haya proyectado un poco.',
        'Entonces proyecta en algún sitio con entradas.',
      ),
    ]),
  ],
);
