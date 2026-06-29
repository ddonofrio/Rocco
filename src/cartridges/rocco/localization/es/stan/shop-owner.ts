import type { RoccoDialogueChoiceNode } from '../../../dialogue';
import { dialogueBranch as branch, dialogueLeaf as leaf } from '../../dialogue-helpers';

export const spanishStanShopOwnerChoice: RoccoDialogueChoiceNode = branch(
  'ask-shop-owner',
  '¿Es usted el dueño de la tienda?',
  'Sí, y del arma que llevo en el bolsillo.',
  [
    branch(
      'owner-what-sell',
      '¿Qué vende?',
      'Cosas que flotan, cosas que casi flotan y confianza.',
      [
        leaf(
          'owner-what-sell-best',
          '¿Qué es lo que más se vende?',
          'Últimamente nada, un día de estos cierro y me voy para siempre.',
        ),
        leaf(
          'owner-what-sell-cheap',
          'Hábleme de Guybrush Threepwood.',
          'Un tipo curioso, me compró un buen barco.',
        ),
        leaf(
          'owner-what-sell-small',
          '¿No tiene la sensación de que nos están mirando?',
          'No, yo estoy bien de la cabeza.',
        ),
        leaf(
          'owner-what-sell-need',
          'Puede que algún día necesite un barco.',
          'Ya no vendo barcos.',
        ),
      ],
    ),
    branch(
      'owner-why-closed',
      'Entonces, ¿por qué está cerrada?',
      'Porque es la hora de la siesta.',
      [
        leaf(
          'owner-why-closed-afraid',
          '¿Y duerme la siesta fuera de la tienda?',
          'Dentro hace un calor insoportable.',
        ),
        leaf('owner-why-closed-when-open', '¿Y a qué hora abre?', 'A las 16:00 h.'),
        leaf('owner-why-closed-exception', '¿No podría hacer una excepción?', 'No.'),
        leaf(
          'owner-why-closed-business',
          'Eso no puede ser bueno para el negocio.',
          'El negocio y yo estamos viendo a otras personas.',
        ),
      ],
    ),
    branch('owner-bad-business', '¿Va mal el negocio?', 'Solo en la parte que implica dinero.', [
      leaf(
        'owner-bad-business-tourists',
        '¿No vienen turistas?',
        'Venir, vienen. Pero cada vez menos.',
      ),
      leaf('owner-bad-business-boats', '¿Nadie quiere recuerdos?', 'Muy pocos.'),
      leaf(
        'owner-bad-business-keep',
        'Entonces, ¿por qué sigue con la tienda?',
        'La cabezonería, la cabezonería.',
      ),
      leaf('owner-bad-business-sympathy', 'Suena duro.', 'Lo es.'),
    ]),
    branch(
      'owner-help',
      '¿Podría ayudarme con algo?',
      'Depende. ¿Paga en efectivo, gratitud o energía rara?',
      [
        leaf(
          'owner-help-energy',
          'Sobre todo energía rara.',
          'Entonces puedo ofrecerte preocupación profesional.',
        ),
        leaf(
          'owner-help-gratitude',
          '¿Gratitud y buenos modales?',
          'Quédate los modales. Cambia la gratitud por monedas.',
        ),
        leaf('owner-help-direction', 'Solo necesito orientación.', '¿Me ves cara de brújula?'),
        leaf(
          'owner-help-survive',
          'Ando perdidillo aquí en el muelle.',
          'Entonces evita las gaviotas: te roban las cosas.',
        ),
      ],
    ),
  ],
);
