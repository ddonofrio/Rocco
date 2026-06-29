import type { RoccoDialogueChoiceNode } from '../../../dialogue';
import { dialogueBranch as branch, dialogueLeaf as leaf } from '../../dialogue-helpers';

export const spanishStanIntroduceSelfChoice: RoccoDialogueChoiceNode = branch(
  'introduce-self',
  'Ehhh... disculpe, señor, soy Rocco.',
  'Yo soy Stan S. Stanman. ¿Qué quieres?',
  [
    branch(
      'intro-nothing',
      'Nada, solo no sé bien qué hacer.',
      'Bien. La confusión sale más barata que los barcos.',
      [
        leaf(
          'intro-nothing-direction',
          '¿Tiene alguna recomendación?',
          'Vuelve cuando Shell City esté abierta y cómprame algo.',
        ),
        leaf(
          'intro-nothing-purpose',
          'Yo apuntaba a un propósito, no a una técnica.',
          'El propósito está arriba. Aquí solo vendemos flotación.',
        ),
        leaf(
          'intro-nothing-sea',
          'El mar tampoco parece muy didáctico.',
          'El mar enseña una lección y además está mojada.',
        ),
        leaf(
          'intro-nothing-sorry',
          'Perdone. Hoy no estoy muy fino.',
          'Entonces has llegado exactamente como espera el muelle.',
        ),
      ],
    ),
    branch(
      'intro-owner',
      '¿Es usted el dueño de esta tienda?',
      'De esta tienda, sí. De mi vida, en absoluto.',
      [
        leaf(
          'intro-owner-sell',
          '¿Qué vende exactamente una tienda cerrada como esta?',
          'En teoría, barcos, piezas, cuerda y optimismo con cita previa.',
        ),
        leaf(
          'intro-owner-open',
          'Entonces, ¿la tienda está abierta?',
          'No. Cerrada cerrada, es hora de la siesta.',
        ),
        leaf('intro-owner-alone', '¿Trabaja usted solo?', 'Sí, pero tengo un arma, solo te aviso.'),
        leaf(
          'intro-owner-buying',
          'Si esto estuviera abierto y alguien comprara algo, ¿se despertaría del todo?',
          '¿Y si tú fueras listo?',
        ),
      ],
    ),
    branch('intro-boats', 'Ah, ¿antes vendía usted barcos?', 'Sí, pero eso fue en otro juego.', [
      leaf(
        'intro-boats-same-stan',
        '¿El mismo Stan?',
        'El mismísimo. Menos pelo, más jerga de garantía.',
      ),
      leaf(
        'intro-boats-pirates',
        '¿Los piratas compraban mucho?',
        'Miraban. A los piratas les encanta el drama y odian las facturas.',
      ),
      leaf(
        'intro-boats-discount',
        '¿Hay descuento para fans veteranos?',
        'Solo sobre la decepción.',
      ),
      leaf(
        'intro-boats-better-game',
        '¿Aquel juego era mejor?',
        'Tenía mejores islas y peores seguros de barco.',
      ),
    ]),
    branch(
      'intro-sleeping',
      'Perdone si le he despertado.',
      'Lo has hecho, tengo el sueño muy ligero.',
      [
        leaf(
          'intro-sleeping-rude',
          '¿He sido grosero?',
          'Grosero amateur. He visto profesionales.',
        ),
        leaf(
          'intro-sleeping-late',
          '¿Prefiere que vuelva más tarde?',
          'Si más tarde trae café, sí.',
        ),
        leaf(
          'intro-sleeping-tired',
          'Suena usted cansado.',
          'Esa es la forma más amable posible de decir viejo.',
        ),
        leaf('intro-sleeping-go', 'Puedo irme si quiere.', 'Sí, mejor. Seguiré durmiendo.'),
      ],
    ),
  ],
);
