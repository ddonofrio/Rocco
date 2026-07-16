import { Container, Graphics, Rectangle, Text, TextStyle } from 'pixi.js';

const FONT_FAMILY = 'Cascadia Mono, Lucida Console, monospace';

export const ROCCO_CARTRIDGE_MENU_COLORS = {
  bg: 0x0d_11_0c,
  bgLine: 0x1a_23_18,
  titleBrand: 0x8e_cf_6e,
  titleSub: 0x4a_6b_42,
  itemBg: 0x11_1a_10,
  itemBgHover: 0x1a_2e_18,
  itemBgSelected: 0x1f_3c_1b,
  itemBorder: 0x2a_3f_28,
  itemBorderSelected: 0x5c_b8_4a,
  itemTitle: 0xd4_ec_c8,
  itemTitleSelected: 0xae_e8_9a,
  itemSub: 0x4e_6b_48,
  itemDisabled: 0x33_41_32,
  scrollBar: 0x2a_3f_28,
  scrollThumb: 0x4a_70_40,
  detailLabel: 0x4a_6b_42,
  detailValue: 0xb0_c8_a8,
  footerHint: 0x5a_70_55,
  scanline: 0x00_00_00,
  panelBg: 0x0f_15_0e,
  panelBorder: 0x22_31_20,
  buttonFill: 0x37_53_34,
  buttonBorder: 0x7d_bb_64,
  buttonText: 0x0d_11_0c,
  controlDim: 0x1a_26_18,
  controlBorder: 0x41_5a_3e,
  controlFill: 0x5c_b8_4a,
  controlText: 0xd7_ef_d0,
} as const;

export const ROCCO_CARTRIDGE_MENU_TOGGLE_W = 94;
export const ROCCO_CARTRIDGE_MENU_TOGGLE_H = 24;

export type RoccoCartridgeMenuTextStyle = Partial<
  ConstructorParameters<typeof TextStyle>[0]
>;

export interface RoccoCartridgeMenuFooterHintAction {
  key: string;
  label: string;
  onPress: () => void;
}

interface RoccoCartridgeMenuPanelOptions {
  panelInset: number;
}

interface RoccoCartridgeMenuFooterOptions {
  designWidth: number;
  footerHeight: number;
  footerY: number;
  startX: number;
  interactiveHint?: RoccoCartridgeMenuFooterHintAction;
}

interface RoccoCartridgeMenuDetailFieldOptions {
  valueOffset?: number;
}

function createGraphicsFillStyle(color: number, alpha = 1): { color: number; alpha: number } {
  return { color, alpha };
}

export class RoccoCartridgeMenuPixiUiPrimitives {
  private readonly root: Container;

  constructor(root: Container) {
    this.root = root;
  }

  private createControlButton(
    x: number,
    y: number,
    label: string,
    fontSize: number,
    textX: number,
    textY: number,
    onPointerDown: () => void,
  ): Container {
    const button = this.createInteractiveContainer(x, y, 20, 20, onPointerDown);
    button.addChild(
      new Graphics()
        .rect(0, 0, 20, 20)
        .fill(ROCCO_CARTRIDGE_MENU_COLORS.itemBgHover)
        .rect(0, 0, 20, 20)
        .stroke({ color: ROCCO_CARTRIDGE_MENU_COLORS.controlBorder, width: 1 }),
    );
    const text = this.makeText(label, {
      fontSize,
      fontWeight: '700',
      fill: ROCCO_CARTRIDGE_MENU_COLORS.controlText,
    });
    text.x = textX;
    text.y = textY;
    button.addChild(text);
    return button;
  }

  drawPanel(
    x: number,
    y: number,
    width: number,
    height: number,
    title: string,
    options: RoccoCartridgeMenuPanelOptions,
  ): void {
    const panel = new Graphics()
      .rect(x, y, width, height)
      .fill(createGraphicsFillStyle(ROCCO_CARTRIDGE_MENU_COLORS.panelBg, 0.95))
      .rect(x, y, width, height)
      .stroke({ color: ROCCO_CARTRIDGE_MENU_COLORS.panelBorder, width: 1.2 });
    this.root.addChild(panel);

    const headerLineY = y + 30;
    this.root.addChild(
      new Graphics().rect(x, headerLineY, width, 1)
        .fill(createGraphicsFillStyle(ROCCO_CARTRIDGE_MENU_COLORS.bgLine)),
    );

    const titleText = this.makeText(title, {
      fontSize: 11,
      fill: ROCCO_CARTRIDGE_MENU_COLORS.titleBrand,
      letterSpacing: 3,
    });
    titleText.x = x + options.panelInset;
    titleText.y = y + 9;
    this.root.addChild(titleText);
  }

  drawFooter(
    hints: ReadonlyArray<readonly [string, string]>,
    options: RoccoCartridgeMenuFooterOptions,
  ): void {
    this.root.addChild(
      new Graphics()
        .rect(0, options.footerY, options.designWidth, options.footerHeight)
        .fill(createGraphicsFillStyle(0x0a_0f_09)),
    );
    this.root.addChild(
      new Graphics().rect(0, options.footerY, options.designWidth, 1)
        .fill(createGraphicsFillStyle(ROCCO_CARTRIDGE_MENU_COLORS.titleBrand, 0.2)),
    );

    let x = options.startX;
    const interactiveHint = options.interactiveHint;
    for (const [key, label] of hints) {
      const keyText = this.makeText(key, {
        fontSize: 13,
        fontWeight: '700',
        fill: ROCCO_CARTRIDGE_MENU_COLORS.titleBrand,
        letterSpacing: 1,
      });
      const labelText = this.makeText(`  ${label}`, {
        fontSize: 13,
        fill: ROCCO_CARTRIDGE_MENU_COLORS.footerHint,
        letterSpacing: 2,
      });
      const isInteractive =
        interactiveHint?.key === key
        && interactiveHint?.label === label;

      if (isInteractive && interactiveHint) {
        const action = this.createInteractiveContainer(
          x - 4,
          options.footerY + 10,
          keyText.width + labelText.width + 8,
          24,
          interactiveHint.onPress,
        );
        keyText.x = 4;
        keyText.y = 6;
        labelText.x = 4 + keyText.width;
        labelText.y = 6;
        action.addChild(keyText);
        action.addChild(labelText);
        this.root.addChild(action);
      } else {
        keyText.x = x;
        keyText.y = options.footerY + 16;
        this.root.addChild(keyText);
        labelText.x = x + keyText.width;
        labelText.y = options.footerY + 16;
        this.root.addChild(labelText);
      }

      x += keyText.width + labelText.width + 24;
    }
  }

  drawSoftButton(
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    onPress: () => void,
    isPrimary = false,
  ): void {
    const button = this.createInteractiveContainer(x, y, width, height, onPress);
    button.addChild(
      new Graphics()
        .roundRect(0, 0, width, height, 4)
        .fill(
          isPrimary
            ? ROCCO_CARTRIDGE_MENU_COLORS.itemBorderSelected
            : ROCCO_CARTRIDGE_MENU_COLORS.buttonFill,
        )
        .roundRect(0, 0, width, height, 4)
        .stroke({
          color: isPrimary
            ? ROCCO_CARTRIDGE_MENU_COLORS.titleBrand
            : ROCCO_CARTRIDGE_MENU_COLORS.buttonBorder,
          width: 2,
        }),
    );

    const text = this.makeText(label, {
      fontSize: 14,
      fontWeight: '700',
      fill: ROCCO_CARTRIDGE_MENU_COLORS.buttonText,
      letterSpacing: 3,
    });
    text.x = (width - text.width) / 2;
    text.y = (height - text.height) / 2;
    button.addChild(text);
    this.root.addChild(button);
  }

  drawDetailField(
    x: number,
    y: number,
    label: string,
    value: string,
    options: RoccoCartridgeMenuDetailFieldOptions = {},
  ): void {
    const labelText = this.makeText(label, {
      fontSize: 10,
      fill: ROCCO_CARTRIDGE_MENU_COLORS.detailLabel,
      letterSpacing: 2,
    });
    labelText.x = x;
    labelText.y = y;
    this.root.addChild(labelText);

    const valueText = this.makeText(value, {
      fontSize: 12,
      fill: ROCCO_CARTRIDGE_MENU_COLORS.detailValue,
      letterSpacing: 1,
    });
    valueText.x = x + (options.valueOffset ?? 120);
    valueText.y = y;
    this.root.addChild(valueText);
  }

  drawAdjustControl(
    parent: Container,
    x: number,
    y: number,
    width: number,
    valueLabel: string,
    onDecrease: () => void,
    onIncrease: () => void,
  ): void {
    parent.addChild(
      new Graphics()
        .roundRect(x, y, width, 28, 4)
        .fill(ROCCO_CARTRIDGE_MENU_COLORS.controlDim)
        .roundRect(x, y, width, 28, 4)
        .stroke({ color: ROCCO_CARTRIDGE_MENU_COLORS.controlBorder, width: 1 }),
    );

    const minus = this.createControlButton(x + 4, y + 4, '-', 16, 6, 0, onDecrease);
    parent.addChild(minus);

    const valueText = this.makeText(valueLabel, {
      fontSize: 12,
      fill: ROCCO_CARTRIDGE_MENU_COLORS.controlText,
      letterSpacing: 1,
    });
    valueText.x = x + (width - valueText.width) / 2;
    valueText.y = y + 6;
    parent.addChild(valueText);

    const plus = this.createControlButton(
      x + width - 24,
      y + 4,
      '+',
      14,
      5,
      1,
      onIncrease,
    );
    parent.addChild(plus);
  }

  drawToggleControl(
    parent: Container,
    x: number,
    y: number,
    isEnabled: boolean,
  ): void {
    const toggle = new Container();
    toggle.x = x;
    toggle.y = y;
    toggle.addChild(
      new Graphics()
        .roundRect(0, 0, ROCCO_CARTRIDGE_MENU_TOGGLE_W, ROCCO_CARTRIDGE_MENU_TOGGLE_H, 4)
        .fill(ROCCO_CARTRIDGE_MENU_COLORS.controlDim)
        .roundRect(0, 0, ROCCO_CARTRIDGE_MENU_TOGGLE_W, ROCCO_CARTRIDGE_MENU_TOGGLE_H, 4)
        .stroke({ color: ROCCO_CARTRIDGE_MENU_COLORS.controlBorder, width: 1 }),
    );

    const activeX = isEnabled ? 2 : ROCCO_CARTRIDGE_MENU_TOGGLE_W / 2;
    toggle.addChild(
      new Graphics()
        .roundRect(
          activeX,
          2,
          ROCCO_CARTRIDGE_MENU_TOGGLE_W / 2 - 4,
          ROCCO_CARTRIDGE_MENU_TOGGLE_H - 4,
          3,
        )
        .fill(ROCCO_CARTRIDGE_MENU_COLORS.controlFill),
    );

    const onText = this.makeText('ON', {
      fontSize: 11,
      fontWeight: '700',
      fill: isEnabled
        ? ROCCO_CARTRIDGE_MENU_COLORS.buttonText
        : ROCCO_CARTRIDGE_MENU_COLORS.detailValue,
      letterSpacing: 1,
    });
    onText.x = 14;
    onText.y = 5;
    toggle.addChild(onText);

    const offText = this.makeText('OFF', {
      fontSize: 11,
      fontWeight: '700',
      fill: isEnabled
        ? ROCCO_CARTRIDGE_MENU_COLORS.detailValue
        : ROCCO_CARTRIDGE_MENU_COLORS.buttonText,
      letterSpacing: 1,
    });
    offText.x = 54;
    offText.y = 5;
    toggle.addChild(offText);

    parent.addChild(toggle);
  }

  createInteractiveContainer(
    x: number,
    y: number,
    width: number,
    height: number,
    onPointerDown: () => void,
  ): Container {
    const container = new Container();
    container.x = x;
    container.y = y;
    container.eventMode = 'static';
    container.hitArea = new Rectangle(0, 0, width, height);
    container.on('pointerdown', onPointerDown);
    return container;
  }

  makeText(text: string, style: RoccoCartridgeMenuTextStyle): Text {
    return new Text({
      text,
      style: new TextStyle({
        fontFamily: FONT_FAMILY,
        fontSize: 12,
        fill: ROCCO_CARTRIDGE_MENU_COLORS.detailValue,
        ...style,
      }),
    });
  }
}
