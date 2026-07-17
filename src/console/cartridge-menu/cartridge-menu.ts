import { Application, Container, Graphics } from 'pixi.js';

import {
  getEffectiveMusicVolume,
  getEffectiveSfxVolume,
  setEffectiveMusicVolume,
  setEffectiveSfxVolume,
  type RoccoSoundProfile,
} from '../audio';
import {
  ROCCO_DISPLAY_BRIGHTNESS_MAX,
  ROCCO_DISPLAY_BRIGHTNESS_MIN,
  ROCCO_DISPLAY_CONTRAST_MAX,
  ROCCO_DISPLAY_CONTRAST_MIN,
  type RoccoDisplayProfile,
} from '../video/display';
import type { RoccoCartridgeManifest } from '../cartridges/types';
import {
  RoccoCartridgeMenuSession,
  type RoccoCartridgeMenuSessionOptions,
} from './cartridge-menu-session';
import {
  ROCCO_CARTRIDGE_MENU_COLORS as C,
  RoccoCartridgeMenuPixiUiPrimitives,
  type RoccoCartridgeMenuFooterHintAction as FooterHintAction,
  type RoccoCartridgeMenuTextStyle,
} from './pixi-ui-primitives';
import {
  FILTER_ROW_IDS,
  SOUND_ROW_IDS,
  VIDEO_ROW_IDS,
  RoccoCartridgeMenuSystemSettingsRenderer,
  type FilterRowId,
  type RoccoMenuSettingsOption,
  type SoundRowId,
  type VideoRowId,
} from './system-settings-page-renderer';

const DESIGN_W = 960;
const DESIGN_H = 540;

const HEADER_H = 90;
const FOOTER_H = 52;
const FOOTER_Y = DESIGN_H - FOOTER_H;

const LIST_TOP = HEADER_H + 16;
const LIST_BOTTOM = DESIGN_H - FOOTER_H - 8;
const LIST_H = LIST_BOTTOM - LIST_TOP;

const ITEM_H = 64;
const ITEM_MARGIN = 6;
const ITEM_STRIDE = ITEM_H + ITEM_MARGIN;
const ITEMS_VISIBLE = Math.floor(LIST_H / ITEM_STRIDE);

const LIST_X = 60;
const LIST_W = DESIGN_W - LIST_X * 2;
const DETAIL_X = LIST_X + LIST_W * 0.55;
const DETAIL_W = LIST_W - (DETAIL_X - LIST_X) - 8;

const SOFT_BUTTON_W = 132;
const SOFT_BUTTON_H = 30;
const DISPLAY_STEP = 0.1;
const VOLUME_STEP = 0.1;

const BASE_SETTINGS_OPTIONS = [
  {
    id: 'video',
    label: 'VIDEO',
    enabled: true,
    statusLabel: 'READY',
    description: 'Console-wide display profile, filters, brightness, and contrast.',
  },
  {
    id: 'sound',
    label: 'SOUND',
    enabled: true,
    statusLabel: 'READY',
    description: 'Console-wide master, music, and effect output levels.',
  },
  {
    id: 'back',
    label: 'BACK',
    enabled: true,
    statusLabel: 'READY',
    description: 'Return to cartridge selection.',
  },
] as const;

export interface CartridgeMenuResult {
  selectedId: string;
  selectedLocale?: string;
}

export interface CartridgeMenuOptions extends RoccoCartridgeMenuSessionOptions {
  onDisplayProfileChange?: (profile: Partial<RoccoDisplayProfile>) => void;
  onSoundProfileChange?: (profile: Partial<RoccoSoundProfile>) => void;
}

export class RoccoCartridgeMenu {
  private readonly stage: Container;
  private readonly session = new RoccoCartridgeMenuSession();
  private onDisplayProfileChange:
    | ((profile: Partial<RoccoDisplayProfile>) => void)
    | undefined;
  private onSoundProfileChange:
    | ((profile: Partial<RoccoSoundProfile>) => void)
    | undefined;

  private root: Container | undefined;
  private ui: RoccoCartridgeMenuPixiUiPrimitives | undefined;
  private settingsRenderer: RoccoCartridgeMenuSystemSettingsRenderer | undefined;
  private resolveSelection: ((result: CartridgeMenuResult) => void) | undefined;
  private readonly boundKeyDown: (event: KeyboardEvent) => void;

  constructor(app: Application) {
    this.stage = app.stage;
    this.boundKeyDown = this.onKeyDown.bind(this);
  }

  private mount(): void {
    this.unmount();
    this.root = new Container();
    this.root.label = 'cartridge-menu-root';
    this.root.zIndex = 999;
    this.root.eventMode = 'static';
    this.ui = new RoccoCartridgeMenuPixiUiPrimitives(this.root);
    this.settingsRenderer = new RoccoCartridgeMenuSystemSettingsRenderer(this.root, this.ui);
    this.stage.sortableChildren = true;
    this.stage.eventMode = 'static';
    this.stage.addChild(this.root);
  }

  private unmount(): void {
    if (!this.root) {
      return;
    }

    this.root.removeFromParent();
    this.root.destroy({ children: true });
    this.root = undefined;
    this.ui = undefined;
    this.settingsRenderer = undefined;
  }

  private render(): void {
    if (!this.root) {
      return;
    }

    for (const child of this.root.removeChildren()) child.destroy({ children: true });

    switch (this.session.page) {
      case 'cartridges': {
        this.drawBackground(true);
        this.drawHeader(
          'SELECT CARTRIDGE',
          `${this.session.manifests.length} CARTRIDGE${this.session.manifests.length === 1 ? '' : 'S'} AVAILABLE`,
        );
        this.drawCartridgeList();
        this.drawCartridgeDetail();
        this.drawScrollBar();
        this.drawFooter([
          ['UP DOWN', 'NAVIGATE'],
          ['ENTER', 'LOAD'],
          ['S', 'SETTINGS'],
        ]);
        this.drawSoftButton(
          DESIGN_W - LIST_X - SOFT_BUTTON_W,
          FOOTER_Y + 11,
          SOFT_BUTTON_W,
          SOFT_BUTTON_H,
          'SETTINGS',
          () => {
            this.session.openSettings();
            this.render();
          },
        );
        break;
      }
      case 'settings': {
        this.drawBackground(true);
        this.drawHeader('SYSTEM SETTINGS', 'CONSOLE CONFIGURATION');
        this.settingsRenderer!.drawSettingsHome({
          settingsOptions: this.getSettingsOptions(),
          settingsSelectionId: this.settingsSelectionId,
          displayProfile: this.session.displayProfile,
          soundProfile: this.session.soundProfile,
          onSettingsRowPointerDown: (optionId) => {
            this.onSettingsRowPointerDown(optionId);
          },
        });
        this.drawFooter([
          ['UP DOWN', 'SELECT'],
          ['ENTER', 'OPEN'],
          ['ESC', 'BACK'],
        ]);
        break;
      }
      case 'video': {
        this.drawBackground(false);
        this.drawHeader('SYSTEM SETTINGS', 'VIDEO OUTPUT');
        this.settingsRenderer!.drawVideoSettings({
          videoSelectionId: this.session.videoSelectionId,
          displayProfile: this.session.displayProfile,
          onVideoRowPointerDown: (id) => {
            this.onVideoRowPointerDown(id);
          },
          onVideoDecrease: (id) => {
            this.session.videoSelectionId = id;
            this.adjustVideoValue(id, -DISPLAY_STEP);
          },
          onVideoIncrease: (id) => {
            this.session.videoSelectionId = id;
            this.adjustVideoValue(id, DISPLAY_STEP);
          },
        });
        this.drawFooter([
          ['UP DOWN', 'SELECT'],
          ['LEFT RIGHT', 'ADJUST'],
          ['ESC', 'BACK'],
        ], {
          key: 'ESC',
          label: 'BACK',
          onPress: () => {
            this.session.returnFromVideoSettings();
            this.render();
          },
        });
        break;
      }
      case 'sound': {
        this.drawBackground(false);
        this.drawHeader('SYSTEM SETTINGS', 'AUDIO OUTPUT');
        this.settingsRenderer!.drawSoundSettings({
          soundSelectionId: this.session.soundSelectionId,
          soundProfile: this.session.soundProfile,
          onSoundRowPointerDown: (id) => {
            this.onSoundRowPointerDown(id);
          },
          onSoundDecrease: (id) => {
            this.session.soundSelectionId = id;
            this.adjustSoundValue(id, -VOLUME_STEP);
          },
          onSoundIncrease: (id) => {
            this.session.soundSelectionId = id;
            this.adjustSoundValue(id, VOLUME_STEP);
          },
        });
        this.drawFooter([
          ['UP DOWN', 'SELECT'],
          ['LEFT RIGHT', 'ADJUST'],
          ['ESC', 'BACK'],
        ], {
          key: 'ESC',
          label: 'BACK',
          onPress: () => {
            this.session.returnFromSoundSettings();
            this.render();
          },
        });
        break;
      }
      case 'filters': {
        this.drawBackground(false);
        this.drawHeader('SYSTEM SETTINGS', 'VIDEO FILTERS');
        this.settingsRenderer!.drawFilterSettings({
          filterSelectionId: this.session.filterSelectionId,
          displayProfile: this.session.displayProfile,
          onFilterRowPointerDown: (id) => {
            this.onFilterRowPointerDown(id);
          },
        });
        this.drawFooter([
          ['UP DOWN', 'SELECT'],
          ['LEFT RIGHT', 'TOGGLE'],
          ['ESC', 'BACK'],
        ], {
          key: 'ESC',
          label: 'BACK',
          onPress: () => {
            this.session.returnFromFilterSettings();
            this.render();
          },
        });
        break;
      }
    }
  }

  private drawBackground(isWithDivider: boolean): void {
    const root = this.root!;

    root.addChild(new Graphics().rect(0, 0, DESIGN_W, DESIGN_H).fill(C.bg));

    const scanlines = new Graphics();
    for (let y = 0; y < DESIGN_H; y += 4) {
      scanlines.rect(0, y, DESIGN_W, 1).fill(Object.assign({}, { color: C.scanline, alpha: 0.18 }));
    }
    root.addChild(scanlines);

    if (isWithDivider) {
      root.addChild(
        new Graphics()
          .rect(DETAIL_X - 16, LIST_TOP, 1, LIST_H)
          .fill(Object.assign({}, { color: C.bgLine, alpha: 0.9 })),
      );
    }
  }

  private drawHeader(subtitle: string, rightText: string): void {
    const root = this.root!;

    root.addChild(
      new Graphics().rect(0, 0, DESIGN_W, HEADER_H).fill(Object.assign({}, { color: 0x0a_0f_09, alpha: 1 })),
    );
    root.addChild(
      new Graphics()
        .rect(0, HEADER_H - 1, DESIGN_W, 1)
        .fill(Object.assign({}, { color: C.titleBrand, alpha: 0.25 })),
    );

    const brand = this.makeText('ROCCO', {
      fontSize: 42,
      fontWeight: '700',
      fill: C.titleBrand,
      letterSpacing: 8,
    });
    brand.x = LIST_X;
    brand.y = 18;
    root.addChild(brand);

    const sub = this.makeText(subtitle, {
      fontSize: 13,
      fill: C.titleSub,
      letterSpacing: 4,
    });
    sub.x = LIST_X + 4;
    sub.y = 66;
    root.addChild(sub);

    const right = this.makeText(rightText, {
      fontSize: 11,
      fill: C.titleSub,
      letterSpacing: 2,
    });
    right.x = DESIGN_W - LIST_X - right.width;
    right.y = 70;
    root.addChild(right);
  }

  private drawCartridgeList(): void {
    const root = this.root!;
    const listW = DETAIL_X - LIST_X - 24;
    const container = new Container();
    root.addChild(container);

    const visibleCount = Math.min(ITEMS_VISIBLE, this.session.manifests.length);
    for (let index = 0; index < visibleCount; index += 1) {
      const dataIndex = this.session.scrollOffset + index;
      const manifest = this.session.manifests[dataIndex];
      if (!manifest) {
        break;
      }

      this.drawCartridgeListItem(
        container,
        this.session.localizeManifest(manifest),
        LIST_TOP + index * ITEM_STRIDE,
        listW,
        dataIndex === this.session.selectedIndex,
        dataIndex,
      );
    }
  }

  private drawCartridgeListItem(
    container: Container,
    manifest: RoccoCartridgeManifest,
    y: number,
    width: number,
    isSelected: boolean,
    dataIndex: number,
  ): void {
    const item = this.createInteractiveContainer(LIST_X, y, width, ITEM_H, () => {
      this.session.selectCartridge(dataIndex);
      this.render();
    });

    item.addChild(
      new Graphics()
        .rect(0, 0, width, ITEM_H)
        .fill(isSelected ? C.itemBgSelected : C.itemBg)
        .rect(0, 0, width, ITEM_H)
        .stroke({ color: isSelected ? C.itemBorderSelected : C.itemBorder, width: isSelected ? 1.5 : 1 }),
    );

    if (isSelected) {
      item.addChild(new Graphics().rect(0, 4, 3, ITEM_H - 8).fill(C.itemBorderSelected));
    }

    const title = this.makeText(manifest.title.toUpperCase(), {
      fontSize: 18,
      fontWeight: isSelected ? '700' : '400',
      fill: isSelected ? C.itemTitleSelected : C.itemTitle,
      letterSpacing: 2,
    });
    title.x = 16;
    title.y = 10;
    item.addChild(title);

    const subParts: string[] = [];
    if (manifest.author) {
      subParts.push(manifest.author);
    }
    if (manifest.genre) {
      subParts.push(manifest.genre);
    }
    if (manifest.releaseYear) {
      subParts.push(String(manifest.releaseYear));
    }
    const subLine = subParts.join(' | ');
    if (subLine) {
      const sub = this.makeText(subLine, {
        fontSize: 11,
        fill: C.itemSub,
        letterSpacing: 1,
      });
      sub.x = 16;
      sub.y = 36;
      item.addChild(sub);
    }

    const version = this.makeText(`v${manifest.version}`, {
      fontSize: 10,
      fill: C.itemSub,
    });
    version.x = width - version.width - 12;
    version.y = ITEM_H - version.height - 8;
    item.addChild(version);

    container.addChild(item);
  }

  private drawCartridgeDetail(): void {
    const manifest = this.session.selectedManifest;
    if (!manifest) {
      return;
    }

    const localizedManifest = this.session.localizeManifest(manifest);
    const container = new Container();
    this.root!.addChild(container);

    let cy = LIST_TOP + 8;
    const lx = DETAIL_X;

    const title = this.makeText(localizedManifest.title.toUpperCase(), {
      fontSize: 22,
      fontWeight: '700',
      fill: C.titleBrand,
      letterSpacing: 3,
      wordWrap: true,
      wordWrapWidth: DETAIL_W,
    });
    title.x = lx;
    title.y = cy;
    container.addChild(title);
    cy += title.height + 12;

    if (localizedManifest.description) {
      const desc = this.makeText(localizedManifest.description, {
        fontSize: 12,
        fill: C.detailValue,
        wordWrap: true,
        wordWrapWidth: DETAIL_W,
        leading: 6,
      });
      desc.x = lx;
      desc.y = cy;
      container.addChild(desc);
      cy += desc.height + 20;
    }

    container.addChild(
      new Graphics().rect(lx, cy, DETAIL_W, 1).fill(Object.assign({}, { color: C.bgLine, alpha: 1 })),
    );
    cy += 14;

    const fields: Array<[string, string | undefined]> = [
      ['PUBLISHER', localizedManifest.publisher ?? localizedManifest.author],
      ['YEAR', localizedManifest.releaseYear ? String(localizedManifest.releaseYear) : undefined],
      ['GENRE', localizedManifest.genre],
      ['PLAYERS', localizedManifest.players],
      ['VERSION', localizedManifest.version],
      ['ID', localizedManifest.id],
    ];

    for (const [label, value] of fields) {
      if (!value) {
        continue;
      }

      const labelText = this.makeText(label, {
        fontSize: 10,
        fill: C.detailLabel,
        letterSpacing: 2,
      });
      labelText.x = lx;
      labelText.y = cy;
      container.addChild(labelText);

      const valueText = this.makeText(value, {
        fontSize: 12,
        fill: C.detailValue,
        letterSpacing: 1,
      });
      valueText.x = lx + 100;
      valueText.y = cy;
      container.addChild(valueText);

      cy += 22;
    }

    cy = this.drawLocaleOptions(container, manifest, lx, cy);

    if (localizedManifest.tags && localizedManifest.tags.length > 0) {
      cy += 8;

      const tagsLabel = this.makeText('TAGS', {
        fontSize: 10,
        fill: C.detailLabel,
        letterSpacing: 2,
      });
      tagsLabel.x = lx;
      tagsLabel.y = cy;
      container.addChild(tagsLabel);

      const tagsValue = this.makeText(localizedManifest.tags.join('  '), {
        fontSize: 10,
        fill: C.itemSub,
        letterSpacing: 1,
        wordWrap: true,
        wordWrapWidth: DETAIL_W,
      });
      tagsValue.x = lx;
      tagsValue.y = cy + 16;
      container.addChild(tagsValue);
      cy += 16 + tagsValue.height + 20;
    } else {
      cy += 16;
    }

    this.drawSoftButton(lx, cy, 100, 30, 'LOAD', () => this.confirm(), true);
  }

  private drawScrollBar(): void {
    if (this.session.manifests.length <= ITEMS_VISIBLE) {
      return;
    }

    const scrollContainer = new Container();
    this.root!.addChild(scrollContainer);

    const barX = LIST_X - 12;
    const barY = LIST_TOP;
    const barH = LIST_H;
    const maxScroll = this.session.manifests.length - ITEMS_VISIBLE;

    scrollContainer.addChild(new Graphics().rect(barX, barY, 4, barH).fill(C.scrollBar));

    const thumbH = Math.max(20, (ITEMS_VISIBLE / this.session.manifests.length) * barH);
    const thumbY = barY + (this.session.scrollOffset / maxScroll) * (barH - thumbH);
    scrollContainer.addChild(new Graphics().rect(barX, thumbY, 4, thumbH).fill(C.scrollThumb));

    const upButton = this.createInteractiveContainer(barX - 4, barY - 18, 16, 16, () => {
      if (this.session.scrollCartridgeList(-1, ITEMS_VISIBLE)) {
        this.render();
      }
    });
    upButton.addChild(
      new Graphics().rect(0, 0, 16, 16).fill(Object.assign({}, { color: 0x00_00_00, alpha: 0.01 })),
    );
    const upText = this.makeText('^', {
      fontSize: 10,
      fill: this.session.scrollOffset > 0 ? C.titleBrand : C.scrollBar,
    });
    upText.x = 5;
    upText.y = 2;
    upButton.addChild(upText);
    scrollContainer.addChild(upButton);

    const downButton = this.createInteractiveContainer(barX - 4, barY + barH + 2, 16, 16, () => {
      if (this.session.scrollCartridgeList(1, ITEMS_VISIBLE)) {
        this.render();
      }
    });
    downButton.addChild(
      new Graphics().rect(0, 0, 16, 16).fill(Object.assign({}, { color: 0x00_00_00, alpha: 0.01 })),
    );
    const downText = this.makeText('v', {
      fontSize: 10,
      fill: this.session.scrollOffset < maxScroll ? C.titleBrand : C.scrollBar,
    });
    downText.x = 5;
    downText.y = 2;
    downButton.addChild(downText);
    scrollContainer.addChild(downButton);
  }

  private drawLocaleOptions(
    container: Container,
    manifest: RoccoCartridgeManifest,
    x: number,
    y: number,
  ): number {
    const locales = this.session.getManifestLocales(manifest);
    if (locales.length <= 1) {
      return y;
    }

    const selectedLocale = this.session.getSelectedLocale(manifest);
    const label = this.makeText('LANGUAGE', {
      fontSize: 10,
      fill: C.detailLabel,
      letterSpacing: 2,
    });
    label.x = x;
    label.y = y;
    container.addChild(label);

    let optionX = x + 100;
    for (const locale of locales) {
      const isSelected = locale === selectedLocale;
      const option = this.createInteractiveContainer(optionX, y - 2, 54, 22, () => {
        this.session.selectLocale(manifest.id, locale);
        this.render();
      });

      option.addChild(
        new Graphics().rect(0, 0, 54, 22).fill(Object.assign({}, { color: 0x00_00_00, alpha: 0.01 })),
      );
      option.addChild(
        new Graphics().circle(7, 9, 6).stroke({
          color: isSelected ? C.titleBrand : C.detailLabel,
          width: 1.5,
        }),
      );
      if (isSelected) {
        option.addChild(new Graphics().circle(7, 9, 3).fill(C.titleBrand));
      }

      const optionLabel = this.makeText(locale.toUpperCase(), {
        fontSize: 12,
        fill: isSelected ? C.titleBrand : C.detailValue,
        letterSpacing: 1,
      });
      optionLabel.x = 18;
      optionLabel.y = 2;
      option.addChild(optionLabel);

      container.addChild(option);
      optionX += 58;
    }

    return y + 28;
  }

  private getSettingsOptions(): RoccoMenuSettingsOption[] {
    const [videoOption, soundOption, backOption] = BASE_SETTINGS_OPTIONS;

    return [
      videoOption,
      soundOption,
      ...this.session.bootSettings.map((setting) => ({
        id: setting.id,
        label: setting.label,
        enabled: true,
        statusLabel: setting.statusLabel ?? 'READY',
        description: setting.description,
        detailLabel: setting.detailLabel,
        getValueLabel: () => setting.getValueLabel(),
        activate: () => setting.activate?.(),
      })),
      backOption,
    ];
  }

  private drawFooter(
    hints: ReadonlyArray<readonly [string, string]>,
    interactiveHint?: FooterHintAction,
  ): void {
    this.ui!.drawFooter(hints, {
      designWidth: DESIGN_W,
      footerHeight: FOOTER_H,
      footerY: FOOTER_Y,
      startX: LIST_X,
      interactiveHint,
    });
  }

  private drawSoftButton(
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    onPress: () => void,
    isPrimary = false,
  ): void {
    this.ui!.drawSoftButton(x, y, width, height, label, onPress, isPrimary);
  }

  private createInteractiveContainer(
    x: number,
    y: number,
    width: number,
    height: number,
    onPointerDown: () => void,
  ): Container {
    return this.ui!.createInteractiveContainer(x, y, width, height, onPointerDown);
  }

  private makeText(text: string, style: RoccoCartridgeMenuTextStyle) {
    return this.ui!.makeText(text, style);
  }

  private onKeyDown(event: KeyboardEvent): void {
    switch (this.session.page) {
      case 'cartridges': {
        this.onCartridgeKeyDown(event);
        break;
      }
      case 'settings': {
        this.onSettingsKeyDown(event);
        break;
      }
      case 'video': {
        this.onVideoKeyDown(event);
        break;
      }
      case 'sound': {
        this.onSoundKeyDown(event);
        break;
      }
      case 'filters': {
        this.onFilterKeyDown(event);
        break;
      }
    }
  }

  private onCartridgeKeyDown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowUp':
      case 'Up': {
        event.preventDefault();
        this.moveSelection(-1);
        break;
      }
      case 'ArrowDown':
      case 'Down': {
        event.preventDefault();
        this.moveSelection(1);
        break;
      }
      case 'Enter':
      case ' ': {
        event.preventDefault();
        this.confirm();
        break;
      }
      case 's':
      case 'S': {
        event.preventDefault();
        this.session.openSettings();
        this.render();
        break;
      }
    }
  }

  private onSettingsKeyDown(event: KeyboardEvent): void {
    const settingsOptionIds = this.getSettingsOptions().map((option) => option.id);

    switch (event.key) {
      case 'ArrowUp':
      case 'Up': {
        event.preventDefault();
        this.session.moveSettingsSelection(settingsOptionIds, -1);
        this.render();
        break;
      }
      case 'ArrowDown':
      case 'Down': {
        event.preventDefault();
        this.session.moveSettingsSelection(settingsOptionIds, 1);
        this.render();
        break;
      }
      case 'Enter':
      case ' ': {
        event.preventDefault();
        this.activateSettingsSelection();
        break;
      }
      case 'Escape':
      case 'Backspace': {
        event.preventDefault();
        this.session.openCartridgeSelection();
        this.render();
        break;
      }
    }
  }

  private onVideoKeyDown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowUp':
      case 'Up': {
        event.preventDefault();
        this.session.moveVideoSelection(VIDEO_ROW_IDS, -1);
        this.render();
        break;
      }
      case 'ArrowDown':
      case 'Down': {
        event.preventDefault();
        this.session.moveVideoSelection(VIDEO_ROW_IDS, 1);
        this.render();
        break;
      }
      case 'ArrowLeft':
      case 'Left': {
        event.preventDefault();
        this.adjustSelectedVideoValue(-DISPLAY_STEP);
        break;
      }
      case 'ArrowRight':
      case 'Right': {
        event.preventDefault();
        this.adjustSelectedVideoValue(DISPLAY_STEP);
        break;
      }
      case 'Enter':
      case ' ': {
        event.preventDefault();
        this.activateVideoSelection();
        break;
      }
      case 'Escape':
      case 'Backspace': {
        event.preventDefault();
        this.session.returnFromVideoSettings();
        this.render();
        break;
      }
    }
  }

  private onFilterKeyDown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowUp':
      case 'Up': {
        event.preventDefault();
        this.session.moveFilterSelection(FILTER_ROW_IDS, -1);
        this.render();
        break;
      }
      case 'ArrowDown':
      case 'Down': {
        event.preventDefault();
        this.session.moveFilterSelection(FILTER_ROW_IDS, 1);
        this.render();
        break;
      }
      case 'ArrowLeft':
      case 'Left': {
        event.preventDefault();
        this.applySelectedFilterValue(false);
        break;
      }
      case 'ArrowRight':
      case 'Right': {
        event.preventDefault();
        this.applySelectedFilterValue(true);
        break;
      }
      case 'Enter':
      case ' ': {
        event.preventDefault();
        this.toggleFilter(this.session.filterSelectionId);
        break;
      }
      case 'Escape':
      case 'Backspace': {
        event.preventDefault();
        this.session.returnFromFilterSettings();
        this.render();
        break;
      }
    }
  }

  private onSoundKeyDown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowUp':
      case 'Up': {
        event.preventDefault();
        this.session.moveSoundSelection(SOUND_ROW_IDS, -1);
        this.render();
        break;
      }
      case 'ArrowDown':
      case 'Down': {
        event.preventDefault();
        this.session.moveSoundSelection(SOUND_ROW_IDS, 1);
        this.render();
        break;
      }
      case 'ArrowLeft':
      case 'Left': {
        event.preventDefault();
        this.adjustSelectedSoundValue(-VOLUME_STEP);
        break;
      }
      case 'ArrowRight':
      case 'Right': {
        event.preventDefault();
        this.adjustSelectedSoundValue(VOLUME_STEP);
        break;
      }
      case 'Enter':
      case ' ': {
        event.preventDefault();
        this.activateSoundSelection();
        break;
      }
      case 'Escape':
      case 'Backspace': {
        event.preventDefault();
        this.session.returnFromSoundSettings();
        this.render();
        break;
      }
    }
  }

  private moveSelection(delta: number): void {
    if (this.session.moveCartridgeSelection(delta, ITEMS_VISIBLE)) {
      this.render();
    }
  }

  private activateSettingsSelection(): void {
    const selectedOption = this.getSettingsOptions().find(
      (option) => option.id === this.settingsSelectionId,
    );
    if (!selectedOption?.enabled) {
      this.render();
      return;
    }

    if (this.session.routeBuiltInSettingsSelection(selectedOption.id)) {
      this.render();
      return;
    }

    void Promise.resolve(selectedOption.activate?.())
      .catch(() => {})
      .then(() => {
        this.render();
      });
  }

  private onSettingsRowPointerDown(optionId: string): void {
    if (this.settingsSelectionId !== optionId) {
      this.settingsSelectionId = optionId;
      this.render();
      return;
    }

    this.activateSettingsSelection();
  }

  private onVideoRowPointerDown(id: VideoRowId): void {
    this.session.videoSelectionId = id;
    if (id === 'filters') {
      this.session.openFilterSettings();
    }
    this.render();
  }

  private onSoundRowPointerDown(id: SoundRowId): void {
    this.session.soundSelectionId = id;
    this.render();
  }

  private onFilterRowPointerDown(id: FilterRowId): void {
    this.session.filterSelectionId = id;
    this.toggleFilter(id);
  }

  private activateSoundSelection(): void {
    this.adjustSelectedSoundValue(VOLUME_STEP);
  }

  private activateVideoSelection(): void {
    switch (this.session.videoSelectionId) {
      case 'filters': {
        this.session.openFilterSettings();
        break;
      }
      case 'brightness':
      case 'contrast': {
        this.adjustVideoValue(this.session.videoSelectionId, DISPLAY_STEP);
        return;
      }
    }
    this.render();
  }

  private adjustSelectedVideoValue(delta: number): void {
    if (
      this.session.videoSelectionId === 'brightness'
      || this.session.videoSelectionId === 'contrast'
    ) {
      this.adjustVideoValue(this.session.videoSelectionId, delta);
    }
  }

  private adjustSelectedSoundValue(delta: number): void {
    this.adjustSoundValue(this.session.soundSelectionId, delta);
  }

  private adjustVideoValue(id: 'brightness' | 'contrast', delta: number): void {
    const nextValue = id === 'brightness'
      ? this.clamp(
          this.session.displayProfile.brightness + delta,
          ROCCO_DISPLAY_BRIGHTNESS_MIN,
          ROCCO_DISPLAY_BRIGHTNESS_MAX,
        )
      : this.clamp(
          this.session.displayProfile.contrast + delta,
          ROCCO_DISPLAY_CONTRAST_MIN,
          ROCCO_DISPLAY_CONTRAST_MAX,
        );
    this.updateDisplayProfile({ [id]: nextValue });
  }

  private adjustSoundValue(id: SoundRowId, delta: number): void {
    if (id === 'master') {
      this.updateSoundProfile({
        masterVolume: this.clamp(this.session.soundProfile.masterVolume + delta, 0, 1),
      });
      return;
    }

    if (id === 'music') {
      const nextMusicVolume = this.clamp(this.getMusicOutputVolume() + delta, 0, 1);
      const nextSoundProfile = setEffectiveMusicVolume(this.session.soundProfile, nextMusicVolume);
      this.updateSoundProfile(nextSoundProfile);
      return;
    }

    const nextSfxVolume = this.clamp(this.getSfxOutputVolume() + delta, 0, 1);
    const nextSoundProfile = setEffectiveSfxVolume(this.session.soundProfile, nextSfxVolume);
    this.updateSoundProfile(nextSoundProfile);
  }

  private applySelectedFilterValue(isEnabled: boolean): void {
    this.updateDisplayProfile({ [this.session.filterSelectionId]: isEnabled });
  }

  private toggleFilter(id: FilterRowId): void {
    this.updateDisplayProfile({ [id]: !this.session.displayProfile[id] });
  }

  private updateDisplayProfile(profile: Partial<RoccoDisplayProfile>): void {
    const nextProfile = this.session.updateDisplayProfile(profile);
    this.onDisplayProfileChange?.(nextProfile);
    this.render();
  }

  private updateSoundProfile(profile: Partial<RoccoSoundProfile>): void {
    const nextProfile = this.session.updateSoundProfile(profile);
    this.onSoundProfileChange?.(nextProfile);
    this.render();
  }

  private confirm(): void {
    const manifest = this.session.selectedManifest;
    if (!manifest || !this.resolveSelection) {
      return;
    }

    const resolve = this.resolveSelection;
    const selectedLocale = this.session.getSelectedLocale(manifest);
    this.dispose();
    resolve({ selectedId: manifest.id, selectedLocale });
  }

  private get settingsSelectionId(): string {
    return this.session.settingsSelectionId;
  }

  private set settingsSelectionId(value: string) {
    this.session.settingsSelectionId = value;
  }

  private getMusicOutputVolume(): number {
    return getEffectiveMusicVolume(this.session.soundProfile);
  }

  private getSfxOutputVolume(): number {
    return getEffectiveSfxVolume(this.session.soundProfile);
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }

  async show(
    manifests: RoccoCartridgeManifest[],
    options: CartridgeMenuOptions = {},
  ): Promise<CartridgeMenuResult> {
    this.session.begin(manifests, options);
    this.onDisplayProfileChange = options.onDisplayProfileChange;
    this.onSoundProfileChange = options.onSoundProfileChange;

    this.mount();
    this.render();

    addEventListener('keydown', this.boundKeyDown);

    return new Promise<CartridgeMenuResult>((resolve) => {
      this.resolveSelection = resolve;
    });
  }

  dispose(): void {
    removeEventListener('keydown', this.boundKeyDown);
    this.unmount();
    this.resolveSelection = undefined;
    this.onDisplayProfileChange = undefined;
    this.onSoundProfileChange = undefined;
  }
}
