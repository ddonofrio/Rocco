import { Application, Container, Graphics, Rectangle, Text, TextStyle } from 'pixi.js';

import {
  getEffectiveMusicVolume,
  getEffectiveSfxVolume,
  resolveRoccoSoundProfile,
  setEffectiveMusicVolume,
  setEffectiveSfxVolume,
  type RoccoSoundProfile,
} from '../audio';
import type { RoccoCartridgeManifest } from '../cartridges/types';
import {
  ROCCO_DISPLAY_BRIGHTNESS_MAX,
  ROCCO_DISPLAY_BRIGHTNESS_MIN,
  ROCCO_DISPLAY_CONTRAST_MAX,
  ROCCO_DISPLAY_CONTRAST_MIN,
  resolveRoccoDisplayProfile,
  type RoccoDisplayProfile,
} from '../video/display';

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

const PANEL_X = 60;
const PANEL_W = DESIGN_W - PANEL_X * 2;
const PANEL_INSET = 18;
const SOFT_BUTTON_W = 132;
const SOFT_BUTTON_H = 30;
const DISPLAY_STEP = 0.1;
const VOLUME_STEP = 0.1;
const TOGGLE_W = 94;
const TOGGLE_H = 24;

const C = {
  bg: 0x0d110c,
  bgLine: 0x1a2318,
  titleBrand: 0x8ecf6e,
  titleSub: 0x4a6b42,
  itemBg: 0x111a10,
  itemBgHover: 0x1a2e18,
  itemBgSelected: 0x1f3c1b,
  itemBorder: 0x2a3f28,
  itemBorderSelected: 0x5cb84a,
  itemTitle: 0xd4ecc8,
  itemTitleSelected: 0xaee89a,
  itemSub: 0x4e6b48,
  itemDisabled: 0x334132,
  scrollBar: 0x2a3f28,
  scrollThumb: 0x4a7040,
  detailLabel: 0x4a6b42,
  detailValue: 0xb0c8a8,
  footerHint: 0x5a7055,
  scanline: 0x000000,
  panelBg: 0x0f150e,
  panelBorder: 0x223120,
  buttonFill: 0x375334,
  buttonBorder: 0x7dbb64,
  buttonText: 0x0d110c,
  controlDim: 0x1a2618,
  controlBorder: 0x415a3e,
  controlFill: 0x5cb84a,
  controlText: 0xd7efd0,
} as const;

const FONT = 'Cascadia Mono, Lucida Console, monospace';

const SETTINGS_OPTIONS = [
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
    id: 'developer',
    label: 'DEVELOPER',
    enabled: true,
    statusLabel: 'JUMPER',
    description: 'Console developer mode is controlled by a physical jumper and cannot be changed here.',
  },
  {
    id: 'back',
    label: 'BACK',
    enabled: true,
    statusLabel: 'READY',
    description: 'Return to cartridge selection.',
  },
] as const;

const VIDEO_ROW_IDS = ['filters', 'brightness', 'contrast'] as const;
const SOUND_ROW_IDS = ['master', 'music', 'effects'] as const;
const FILTER_ROW_IDS = ['roundedCorners', 'crtMask', 'edgeVignette'] as const;
type MenuPage = 'cartridges' | 'settings' | 'video' | 'sound' | 'filters';
type SettingsOptionId = (typeof SETTINGS_OPTIONS)[number]['id'];
type VideoRowId = (typeof VIDEO_ROW_IDS)[number];
type SoundRowId = (typeof SOUND_ROW_IDS)[number];
type FilterRowId = (typeof FILTER_ROW_IDS)[number];
type FooterHintAction = {
  key: string;
  label: string;
  onPress: () => void;
};

export interface CartridgeMenuResult {
  selectedId: string;
  selectedLocale?: string;
}

export interface CartridgeMenuOptions {
  initialLocales?: Record<string, string>;
  initialDisplayProfile?: Partial<RoccoDisplayProfile>;
  initialSoundProfile?: Partial<RoccoSoundProfile>;
  developerModeEnabled?: boolean;
  onDisplayProfileChange?: (profile: Partial<RoccoDisplayProfile>) => void;
  onSoundProfileChange?: (profile: Partial<RoccoSoundProfile>) => void;
}

export class RoccoCartridgeMenu {
  private readonly stage: Container;
  private manifests: RoccoCartridgeManifest[] = [];
  private selectedLocales = new Map<string, string>();

  private scrollOffset = 0;
  private selectedIndex = 0;
  private page: MenuPage = 'cartridges';
  private settingsSelectionId: SettingsOptionId = 'video';
  private videoSelectionId: VideoRowId = 'filters';
  private soundSelectionId: SoundRowId = 'master';
  private filterSelectionId: FilterRowId = 'roundedCorners';
  private displayProfile = resolveRoccoDisplayProfile();
  private soundProfile = resolveRoccoSoundProfile();
  private developerModeEnabled = false;
  private onDisplayProfileChange:
    | ((profile: Partial<RoccoDisplayProfile>) => void)
    | undefined;
  private onSoundProfileChange:
    | ((profile: Partial<RoccoSoundProfile>) => void)
    | undefined;

  private root: Container | null = null;
  private resolveSelection: ((result: CartridgeMenuResult) => void) | null = null;
  private readonly boundKeyDown: (e: KeyboardEvent) => void;

  constructor(app: Application) {
    this.stage = app.stage;
    this.boundKeyDown = this.onKeyDown.bind(this);
  }

  async show(
    manifests: RoccoCartridgeManifest[],
    options: CartridgeMenuOptions = {},
  ): Promise<CartridgeMenuResult> {
    this.manifests = manifests;
    this.selectedLocales = new Map(Object.entries(options.initialLocales ?? {}));
    this.selectedIndex = 0;
    this.scrollOffset = 0;
    this.page = 'cartridges';
    this.settingsSelectionId = 'video';
    this.videoSelectionId = 'filters';
    this.soundSelectionId = 'master';
    this.filterSelectionId = 'roundedCorners';
    this.displayProfile = resolveRoccoDisplayProfile(options.initialDisplayProfile);
    this.soundProfile = resolveRoccoSoundProfile(options.initialSoundProfile);
    this.developerModeEnabled = options.developerModeEnabled ?? false;
    this.onDisplayProfileChange = options.onDisplayProfileChange;
    this.onSoundProfileChange = options.onSoundProfileChange;

    this.mount();
    this.render();

    window.addEventListener('keydown', this.boundKeyDown);

    return new Promise<CartridgeMenuResult>((resolve) => {
      this.resolveSelection = resolve;
    });
  }

  dispose(): void {
    window.removeEventListener('keydown', this.boundKeyDown);
    this.unmount();
    this.resolveSelection = null;
    this.onDisplayProfileChange = undefined;
    this.onSoundProfileChange = undefined;
  }

  private mount(): void {
    this.unmount();
    this.root = new Container();
    this.root.label = 'cartridge-menu-root';
    this.root.zIndex = 999;
    this.root.eventMode = 'static';
    this.stage.sortableChildren = true;
    this.stage.eventMode = 'static';
    this.stage.addChild(this.root);
  }

  private unmount(): void {
    if (!this.root) {
      return;
    }

    this.stage.removeChild(this.root);
    this.root.destroy({ children: true });
    this.root = null;
  }

  private render(): void {
    if (!this.root) {
      return;
    }

    this.root.removeChildren().forEach((child) => child.destroy({ children: true }));

    switch (this.page) {
      case 'cartridges':
        this.drawBackground(true);
        this.drawHeader(
          'SELECT CARTRIDGE',
          `${this.manifests.length} CARTRIDGE${this.manifests.length !== 1 ? 'S' : ''} AVAILABLE`,
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
            this.page = 'settings';
            this.render();
          },
        );
        break;
      case 'settings':
        this.drawBackground(true);
        this.drawHeader('SYSTEM SETTINGS', 'CONSOLE CONFIGURATION');
        this.drawSettingsHome();
        this.drawFooter([
          ['UP DOWN', 'SELECT'],
          ['ENTER', 'OPEN'],
          ['ESC', 'BACK'],
        ]);
        break;
      case 'video':
        this.drawBackground(false);
        this.drawHeader('SYSTEM SETTINGS', 'VIDEO OUTPUT');
        this.drawVideoSettings();
        this.drawFooter([
          ['UP DOWN', 'SELECT'],
          ['LEFT RIGHT', 'ADJUST'],
          ['ESC', 'BACK'],
        ], {
          key: 'ESC',
          label: 'BACK',
          onPress: () => {
            this.page = 'settings';
            this.settingsSelectionId = 'video';
            this.render();
          },
        });
        break;
      case 'sound':
        this.drawBackground(false);
        this.drawHeader('SYSTEM SETTINGS', 'AUDIO OUTPUT');
        this.drawSoundSettings();
        this.drawFooter([
          ['UP DOWN', 'SELECT'],
          ['LEFT RIGHT', 'ADJUST'],
          ['ESC', 'BACK'],
        ], {
          key: 'ESC',
          label: 'BACK',
          onPress: () => {
            this.page = 'settings';
            this.settingsSelectionId = 'sound';
            this.render();
          },
        });
        break;
      case 'filters':
        this.drawBackground(false);
        this.drawHeader('SYSTEM SETTINGS', 'VIDEO FILTERS');
        this.drawFilterSettings();
        this.drawFooter([
          ['UP DOWN', 'SELECT'],
          ['LEFT RIGHT', 'TOGGLE'],
          ['ESC', 'BACK'],
        ], {
          key: 'ESC',
          label: 'BACK',
          onPress: () => {
            this.page = 'video';
            this.videoSelectionId = 'filters';
            this.render();
          },
        });
        break;
    }
  }

  private drawBackground(withDivider: boolean): void {
    const root = this.root!;

    root.addChild(new Graphics().rect(0, 0, DESIGN_W, DESIGN_H).fill(C.bg));

    const scanlines = new Graphics();
    for (let y = 0; y < DESIGN_H; y += 4) {
      scanlines.rect(0, y, DESIGN_W, 1).fill({ color: C.scanline, alpha: 0.18 });
    }
    root.addChild(scanlines);

    if (withDivider) {
      root.addChild(
        new Graphics()
          .rect(DETAIL_X - 16, LIST_TOP, 1, LIST_H)
          .fill({ color: C.bgLine, alpha: 0.9 }),
      );
    }
  }

  private drawHeader(subtitle: string, rightText: string): void {
    const root = this.root!;

    root.addChild(new Graphics().rect(0, 0, DESIGN_W, HEADER_H).fill({ color: 0x0a0f09, alpha: 1 }));
    root.addChild(
      new Graphics().rect(0, HEADER_H - 1, DESIGN_W, 1).fill({ color: C.titleBrand, alpha: 0.25 }),
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

    const visibleCount = Math.min(ITEMS_VISIBLE, this.manifests.length);
    for (let i = 0; i < visibleCount; i += 1) {
      const dataIndex = this.scrollOffset + i;
      const manifest = this.manifests[dataIndex];
      if (!manifest) {
        break;
      }

      this.drawCartridgeListItem(
        container,
        this.localizeManifest(manifest),
        LIST_TOP + i * ITEM_STRIDE,
        listW,
        dataIndex === this.selectedIndex,
        dataIndex,
      );
    }
  }

  private drawCartridgeListItem(
    container: Container,
    manifest: RoccoCartridgeManifest,
    y: number,
    width: number,
    selected: boolean,
    dataIndex: number,
  ): void {
    const item = this.createInteractiveContainer(LIST_X, y, width, ITEM_H, () => {
      this.selectedIndex = dataIndex;
      this.render();
    });

    item.addChild(
      new Graphics()
        .rect(0, 0, width, ITEM_H)
        .fill(selected ? C.itemBgSelected : C.itemBg)
        .rect(0, 0, width, ITEM_H)
        .stroke({ color: selected ? C.itemBorderSelected : C.itemBorder, width: selected ? 1.5 : 1 }),
    );

    if (selected) {
      item.addChild(new Graphics().rect(0, 4, 3, ITEM_H - 8).fill(C.itemBorderSelected));
    }

    const title = this.makeText(manifest.title.toUpperCase(), {
      fontSize: 18,
      fontWeight: selected ? '700' : '400',
      fill: selected ? C.itemTitleSelected : C.itemTitle,
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
    const manifest = this.manifests[this.selectedIndex];
    if (!manifest) {
      return;
    }

    const localizedManifest = this.localizeManifest(manifest);
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
      new Graphics().rect(lx, cy, DETAIL_W, 1).fill({ color: C.bgLine, alpha: 1 }),
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
    if (this.manifests.length <= ITEMS_VISIBLE) {
      return;
    }

    const scrollContainer = new Container();
    this.root!.addChild(scrollContainer);

    const barX = LIST_X - 12;
    const barY = LIST_TOP;
    const barH = LIST_H;
    const maxScroll = this.manifests.length - ITEMS_VISIBLE;

    scrollContainer.addChild(new Graphics().rect(barX, barY, 4, barH).fill(C.scrollBar));

    const thumbH = Math.max(20, (ITEMS_VISIBLE / this.manifests.length) * barH);
    const thumbY = barY + (this.scrollOffset / maxScroll) * (barH - thumbH);
    scrollContainer.addChild(new Graphics().rect(barX, thumbY, 4, thumbH).fill(C.scrollThumb));

    const upButton = this.createInteractiveContainer(barX - 4, barY - 18, 16, 16, () => {
      if (this.scrollOffset > 0) {
        this.scrollOffset -= 1;
        this.render();
      }
    });
    upButton.addChild(new Graphics().rect(0, 0, 16, 16).fill({ color: 0x000000, alpha: 0.01 }));
    const upText = this.makeText('^', {
      fontSize: 10,
      fill: this.scrollOffset > 0 ? C.titleBrand : C.scrollBar,
    });
    upText.x = 5;
    upText.y = 2;
    upButton.addChild(upText);
    scrollContainer.addChild(upButton);

    const downButton = this.createInteractiveContainer(barX - 4, barY + barH + 2, 16, 16, () => {
      if (this.scrollOffset < maxScroll) {
        this.scrollOffset += 1;
        this.render();
      }
    });
    downButton.addChild(new Graphics().rect(0, 0, 16, 16).fill({ color: 0x000000, alpha: 0.01 }));
    const downText = this.makeText('v', {
      fontSize: 10,
      fill: this.scrollOffset < maxScroll ? C.titleBrand : C.scrollBar,
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
    const locales = this.getManifestLocales(manifest);
    if (locales.length <= 1) {
      return y;
    }

    const selectedLocale = this.getSelectedLocale(manifest);
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
        this.selectedLocales.set(manifest.id, locale);
        this.render();
      });

      option.addChild(new Graphics().rect(0, 0, 54, 22).fill({ color: 0x000000, alpha: 0.01 }));
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

  private drawSettingsHome(): void {
    const selectedOption = SETTINGS_OPTIONS.find((option) => option.id === this.settingsSelectionId)
      ?? SETTINGS_OPTIONS[0];
    const leftW = 320;
    const rightX = PANEL_X + leftW + 24;
    const rightW = PANEL_W - leftW - 24;

    this.drawPanel(PANEL_X, LIST_TOP, leftW, 286, 'MODULES');
    this.drawPanel(rightX, LIST_TOP, rightW, 286, 'DETAIL');

    let rowY = LIST_TOP + 42;
    for (const option of SETTINGS_OPTIONS) {
      const selected = option.id === this.settingsSelectionId;
      const row = this.createInteractiveContainer(PANEL_X + 14, rowY, leftW - 28, 50, () => {
        this.settingsSelectionId = option.id;
        if (option.enabled && option.id === 'video') {
          this.page = 'video';
        } else if (option.enabled && option.id === 'sound') {
          this.page = 'sound';
        } else if (option.enabled && option.id === 'back') {
          this.page = 'cartridges';
        }
        this.render();
      });

      row.addChild(
        new Graphics()
          .rect(0, 0, leftW - 28, 50)
          .fill(selected ? C.itemBgSelected : C.itemBg)
          .rect(0, 0, leftW - 28, 50)
          .stroke({ color: selected ? C.itemBorderSelected : C.itemBorder, width: 1 }),
      );

      const label = this.makeText(option.label, {
        fontSize: 18,
        fontWeight: selected ? '700' : '400',
        fill: option.enabled
          ? selected
            ? C.itemTitleSelected
            : C.itemTitle
          : C.itemDisabled,
        letterSpacing: 2,
      });
      label.x = 14;
      label.y = 12;
      row.addChild(label);

      const status = this.makeText(option.statusLabel, {
        fontSize: 10,
        fill: option.enabled ? C.detailValue : C.itemDisabled,
        letterSpacing: 1,
      });
      status.x = leftW - 28 - status.width - 12;
      status.y = 18;
      row.addChild(status);

      this.root!.addChild(row);
      rowY += 58;
    }

    const title = this.makeText(selectedOption.label, {
      fontSize: 24,
      fontWeight: '700',
      fill: selectedOption.enabled ? C.titleBrand : C.itemDisabled,
      letterSpacing: 3,
    });
    title.x = rightX + PANEL_INSET;
    title.y = LIST_TOP + 46;
    this.root!.addChild(title);

    const desc = this.makeText(selectedOption.description, {
      fontSize: 13,
      fill: C.detailValue,
      wordWrap: true,
      wordWrapWidth: rightW - PANEL_INSET * 2,
      leading: 6,
    });
    desc.x = rightX + PANEL_INSET;
    desc.y = LIST_TOP + 88;
    this.root!.addChild(desc);

    if (selectedOption.id === 'video') {
      this.drawDetailField(rightX + PANEL_INSET, LIST_TOP + 170, 'FILTERS', `${this.countEnabledFilters()} / 3 ON`);
      this.drawDetailField(rightX + PANEL_INSET, LIST_TOP + 198, 'BRIGHTNESS', this.formatPercent(this.displayProfile.brightness));
      this.drawDetailField(rightX + PANEL_INSET, LIST_TOP + 226, 'CONTRAST', this.formatPercent(this.displayProfile.contrast));
    } else if (selectedOption.id === 'sound') {
      this.drawDetailField(rightX + PANEL_INSET, LIST_TOP + 170, 'MASTER', this.formatPercent(this.soundProfile.masterVolume));
      this.drawDetailField(rightX + PANEL_INSET, LIST_TOP + 198, 'MUSIC', this.formatPercent(this.getMusicOutputVolume()));
      this.drawDetailField(rightX + PANEL_INSET, LIST_TOP + 226, 'SFX', this.formatPercent(this.getSfxOutputVolume()));
    } else if (selectedOption.id === 'developer') {
      this.drawDetailField(
        rightX + PANEL_INSET,
        LIST_TOP + 170,
        'STATUS',
        `${this.developerModeEnabled ? 'ON' : 'OFF'} (READ ONLY)`,
      );

      const jumperNote = this.makeText(
        this.developerModeEnabled
          ? 'Set the console jumper from DEVELOPER to NORMAL to disable developer mode.'
          : 'Set the console jumper from NORMAL to DEVELOPER to enable developer mode.',
        {
          fontSize: 13,
          fill: C.detailValue,
          wordWrap: true,
          wordWrapWidth: rightW - PANEL_INSET * 2,
          leading: 6,
        },
      );
      jumperNote.x = rightX + PANEL_INSET;
      jumperNote.y = LIST_TOP + 202;
      this.root!.addChild(jumperNote);
    } else {
      this.drawDetailField(
        rightX + PANEL_INSET,
        LIST_TOP + 170,
        'STATUS',
        selectedOption.enabled ? 'AVAILABLE' : 'DISABLED',
      );
    }
  }

  private drawVideoSettings(): void {
    this.drawPanel(PANEL_X, LIST_TOP, PANEL_W, 114, 'VIDEO STATUS');
    this.drawVideoInfoGrid();

    this.drawPanel(PANEL_X, LIST_TOP + 136, PANEL_W, 214, 'OPTIONS');

    let rowY = LIST_TOP + 178;
    rowY = this.drawVideoOptionRow('filters', 'FILTERS', rowY);
    rowY = this.drawVideoOptionRow('brightness', 'BRIGHTNESS', rowY);
    this.drawVideoOptionRow('contrast', 'CONTRAST', rowY);
  }

  private drawVideoInfoGrid(): void {
    const fields: Array<[string, string]> = [
      ['DEFINITION', '960 x 540'],
      ['COLORS', '16.7M (24-BIT RGB)'],
      ['COLOR MODEL', 'NATIVE RGB'],
    ];

    const startX = PANEL_X + PANEL_INSET;
    const startY = LIST_TOP + 48;
    const columnGap = 390;
    const rowGap = 34;

    fields.forEach(([label, value], index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);
      this.drawDetailField(startX + column * columnGap, startY + row * rowGap, label, value);
    });
  }

  private drawVideoOptionRow(id: VideoRowId, label: string, y: number): number {
    const selected = this.videoSelectionId === id;
    const row = this.createInteractiveContainer(PANEL_X + 14, y, PANEL_W - 28, 46, () => {
      this.videoSelectionId = id;
      if (id === 'filters') {
        this.page = 'filters';
        this.render();
        return;
      }
      this.render();
    });

    row.addChild(
      new Graphics()
        .rect(0, 0, PANEL_W - 28, 46)
        .fill(selected ? C.itemBgSelected : C.itemBg)
        .rect(0, 0, PANEL_W - 28, 46)
        .stroke({ color: selected ? C.itemBorderSelected : C.itemBorder, width: 1 }),
    );

    const text = this.makeText(label, {
      fontSize: 16,
      fontWeight: selected ? '700' : '400',
      fill: selected ? C.itemTitleSelected : C.itemTitle,
      letterSpacing: 2,
    });
    text.x = 14;
    text.y = 13;
    row.addChild(text);

    if (id === 'filters') {
      const summary = this.makeText(`${this.countEnabledFilters()} / 3 ON`, {
        fontSize: 11,
        fill: C.detailValue,
        letterSpacing: 1,
      });
      summary.x = PANEL_W - 28 - summary.width - 42;
      summary.y = 16;
      row.addChild(summary);

      const chevron = this.makeText('>', {
        fontSize: 16,
        fill: selected ? C.titleBrand : C.detailValue,
      });
      chevron.x = PANEL_W - 28 - 18;
      chevron.y = 12;
      row.addChild(chevron);
    } else {
      const profileKey = id === 'brightness' ? 'brightness' : 'contrast';
      const value = this.displayProfile[profileKey];
      this.drawAdjustControl(
        row,
        PANEL_W - 28 - 214,
        9,
        200,
        value,
        () => {
          this.videoSelectionId = id;
          this.adjustVideoValue(id, -DISPLAY_STEP);
        },
        () => {
          this.videoSelectionId = id;
          this.adjustVideoValue(id, DISPLAY_STEP);
        },
      );
    }

    this.root!.addChild(row);
    return y + 54;
  }

  private drawFilterSettings(): void {
    this.drawPanel(PANEL_X, LIST_TOP, PANEL_W, 118, 'ACTIVE FILTERS');

    const desc = this.makeText(
      'Toggle the built-in console display effects. Changes apply immediately and reset on the next boot.',
      {
        fontSize: 13,
        fill: C.detailValue,
        wordWrap: true,
        wordWrapWidth: PANEL_W - PANEL_INSET * 2,
        leading: 6,
      },
    );
    desc.x = PANEL_X + PANEL_INSET;
    desc.y = LIST_TOP + 50;
    this.root!.addChild(desc);

    this.drawPanel(PANEL_X, LIST_TOP + 140, PANEL_W, 244, 'FILTERS');

    let rowY = LIST_TOP + 182;
    rowY = this.drawFilterOptionRow('roundedCorners', 'ROUNDED CORNERS', rowY);
    rowY = this.drawFilterOptionRow('crtMask', 'CRT SHADOW MASK', rowY);
    this.drawFilterOptionRow('edgeVignette', 'EDGE VIGNETTE', rowY);
  }

  private drawSoundSettings(): void {
    this.drawPanel(PANEL_X, LIST_TOP, PANEL_W, 148, 'MIX STATUS');
    this.drawSoundInfoGrid();

    this.drawPanel(PANEL_X, LIST_TOP + 170, PANEL_W, 214, 'CHANNELS');

    let rowY = LIST_TOP + 212;
    rowY = this.drawSoundOptionRow('master', 'MASTER VOLUME', rowY);
    rowY = this.drawSoundOptionRow('music', 'MUSIC VOLUME', rowY);
    this.drawSoundOptionRow('effects', 'SFX VOLUME', rowY);
  }

  private drawSoundInfoGrid(): void {
    const fields: Array<[string, string]> = [
      ['MASTER', this.formatPercent(this.soundProfile.masterVolume)],
      ['MUSIC OUTPUT', this.formatPercent(this.getMusicOutputVolume())],
      ['SFX OUTPUT', this.formatPercent(this.getSfxOutputVolume())],
      ['ROUTING', 'MASTER x CHANNEL'],
    ];

    const startX = PANEL_X + PANEL_INSET;
    const startY = LIST_TOP + 48;
    const columnGap = 390;
    const rowGap = 34;

    fields.forEach(([label, value], index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);
      this.drawDetailField(startX + column * columnGap, startY + row * rowGap, label, value);
    });
  }

  private drawSoundOptionRow(id: SoundRowId, label: string, y: number): number {
    const selected = this.soundSelectionId === id;
    const row = this.createInteractiveContainer(PANEL_X + 14, y, PANEL_W - 28, 46, () => {
      this.soundSelectionId = id;
      this.render();
    });

    row.addChild(
      new Graphics()
        .rect(0, 0, PANEL_W - 28, 46)
        .fill(selected ? C.itemBgSelected : C.itemBg)
        .rect(0, 0, PANEL_W - 28, 46)
        .stroke({ color: selected ? C.itemBorderSelected : C.itemBorder, width: 1 }),
    );

    const text = this.makeText(label, {
      fontSize: 16,
      fontWeight: selected ? '700' : '400',
      fill: selected ? C.itemTitleSelected : C.itemTitle,
      letterSpacing: 2,
    });
    text.x = 14;
    text.y = 13;
    row.addChild(text);

    const value =
      id === 'master'
        ? this.soundProfile.masterVolume
        : id === 'music'
          ? this.getMusicOutputVolume()
          : this.getSfxOutputVolume();
    this.drawAdjustControl(
      row,
      PANEL_W - 28 - 214,
      9,
      200,
      value,
      () => {
        this.soundSelectionId = id;
        this.adjustSoundValue(id, -VOLUME_STEP);
      },
      () => {
        this.soundSelectionId = id;
        this.adjustSoundValue(id, VOLUME_STEP);
      },
    );

    this.root!.addChild(row);
    return y + 54;
  }

  private drawFilterOptionRow(id: FilterRowId, label: string, y: number): number {
    const selected = this.filterSelectionId === id;
    const enabled = this.displayProfile[id];
    const row = this.createInteractiveContainer(PANEL_X + 14, y, PANEL_W - 28, 46, () => {
      this.filterSelectionId = id;
      this.toggleFilter(id);
    });

    row.addChild(
      new Graphics()
        .rect(0, 0, PANEL_W - 28, 46)
        .fill(selected ? C.itemBgSelected : C.itemBg)
        .rect(0, 0, PANEL_W - 28, 46)
        .stroke({ color: selected ? C.itemBorderSelected : C.itemBorder, width: 1 }),
    );

    const text = this.makeText(label, {
      fontSize: 16,
      fontWeight: selected ? '700' : '400',
      fill: selected ? C.itemTitleSelected : C.itemTitle,
      letterSpacing: 2,
    });
    text.x = 14;
    text.y = 13;
    row.addChild(text);

    this.drawToggleControl(row, PANEL_W - 28 - TOGGLE_W - 14, 11, enabled);

    this.root!.addChild(row);
    return y + 54;
  }

  private drawPanel(x: number, y: number, width: number, height: number, title: string): void {
    const panel = new Graphics()
      .rect(x, y, width, height)
      .fill({ color: C.panelBg, alpha: 0.95 })
      .rect(x, y, width, height)
      .stroke({ color: C.panelBorder, width: 1.2 });
    this.root!.addChild(panel);

    const headerLineY = y + 30;
    this.root!.addChild(
      new Graphics().rect(x, headerLineY, width, 1).fill({ color: C.bgLine, alpha: 1 }),
    );

    const titleText = this.makeText(title, {
      fontSize: 11,
      fill: C.titleBrand,
      letterSpacing: 3,
    });
    titleText.x = x + PANEL_INSET;
    titleText.y = y + 9;
    this.root!.addChild(titleText);
  }

  private drawFooter(
    hints: ReadonlyArray<readonly [string, string]>,
    interactiveHint?: FooterHintAction,
  ): void {
    const root = this.root!;

    root.addChild(new Graphics().rect(0, FOOTER_Y, DESIGN_W, FOOTER_H).fill({ color: 0x0a0f09, alpha: 1 }));
    root.addChild(
      new Graphics().rect(0, FOOTER_Y, DESIGN_W, 1).fill({ color: C.titleBrand, alpha: 0.2 }),
    );

    let x = LIST_X;
    for (const [key, label] of hints) {
      const keyText = this.makeText(key, {
        fontSize: 13,
        fontWeight: '700',
        fill: C.titleBrand,
        letterSpacing: 1,
      });
      const labelText = this.makeText(`  ${label}`, {
        fontSize: 13,
        fill: C.footerHint,
        letterSpacing: 2,
      });
      const isInteractive =
        interactiveHint?.key === key && interactiveHint?.label === label;

      if (isInteractive) {
        const action = this.createInteractiveContainer(
          x - 4,
          FOOTER_Y + 10,
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
        root.addChild(action);
      } else {
        keyText.x = x;
        keyText.y = FOOTER_Y + 16;
        root.addChild(keyText);
        labelText.x = x + keyText.width;
        labelText.y = FOOTER_Y + 16;
        root.addChild(labelText);
      }

      x += keyText.width + labelText.width + 24;
    }
  }

  private drawSoftButton(
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    onPress: () => void,
    primary = false,
  ): void {
    const button = this.createInteractiveContainer(x, y, width, height, onPress);
    button.addChild(
      new Graphics()
        .roundRect(0, 0, width, height, 4)
        .fill(primary ? C.itemBorderSelected : C.buttonFill)
        .roundRect(0, 0, width, height, 4)
        .stroke({ color: primary ? C.titleBrand : C.buttonBorder, width: 2 }),
    );

    const text = this.makeText(label, {
      fontSize: 14,
      fontWeight: '700',
      fill: C.buttonText,
      letterSpacing: 3,
    });
    text.x = (width - text.width) / 2;
    text.y = (height - text.height) / 2;
    button.addChild(text);
    this.root!.addChild(button);
  }

  private drawDetailField(x: number, y: number, label: string, value: string): void {
    const labelText = this.makeText(label, {
      fontSize: 10,
      fill: C.detailLabel,
      letterSpacing: 2,
    });
    labelText.x = x;
    labelText.y = y;
    this.root!.addChild(labelText);

    const valueText = this.makeText(value, {
      fontSize: 12,
      fill: C.detailValue,
      letterSpacing: 1,
    });
    valueText.x = x + 120;
    valueText.y = y;
    this.root!.addChild(valueText);
  }

  private drawAdjustControl(
    parent: Container,
    x: number,
    y: number,
    width: number,
    value: number,
    onDecrease: () => void,
    onIncrease: () => void,
  ): void {
    parent.addChild(
      new Graphics()
        .roundRect(x, y, width, 28, 4)
        .fill(C.controlDim)
        .roundRect(x, y, width, 28, 4)
        .stroke({ color: C.controlBorder, width: 1 }),
    );

    const minus = this.createInteractiveContainer(x + 4, y + 4, 20, 20, onDecrease);
    minus.addChild(
      new Graphics()
        .rect(0, 0, 20, 20)
        .fill(C.itemBgHover)
        .rect(0, 0, 20, 20)
        .stroke({ color: C.controlBorder, width: 1 }),
    );
    const minusText = this.makeText('-', {
      fontSize: 16,
      fontWeight: '700',
      fill: C.controlText,
    });
    minusText.x = 6;
    minusText.y = 0;
    minus.addChild(minusText);
    parent.addChild(minus);

    const valueText = this.makeText(this.formatPercent(value), {
      fontSize: 12,
      fill: C.controlText,
      letterSpacing: 1,
    });
    valueText.x = x + (width - valueText.width) / 2;
    valueText.y = y + 6;
    parent.addChild(valueText);

    const plus = this.createInteractiveContainer(x + width - 24, y + 4, 20, 20, onIncrease);
    plus.addChild(
      new Graphics()
        .rect(0, 0, 20, 20)
        .fill(C.itemBgHover)
        .rect(0, 0, 20, 20)
        .stroke({ color: C.controlBorder, width: 1 }),
    );
    const plusText = this.makeText('+', {
      fontSize: 14,
      fontWeight: '700',
      fill: C.controlText,
    });
    plusText.x = 5;
    plusText.y = 1;
    plus.addChild(plusText);
    parent.addChild(plus);
  }

  private drawToggleControl(
    parent: Container,
    x: number,
    y: number,
    enabled: boolean,
  ): void {
    const toggle = new Container();
    toggle.x = x;
    toggle.y = y;
    toggle.addChild(
      new Graphics()
        .roundRect(0, 0, TOGGLE_W, TOGGLE_H, 4)
        .fill(C.controlDim)
        .roundRect(0, 0, TOGGLE_W, TOGGLE_H, 4)
        .stroke({ color: C.controlBorder, width: 1 }),
    );

    const activeX = enabled ? 2 : TOGGLE_W / 2;
    toggle.addChild(
      new Graphics()
        .roundRect(activeX, 2, TOGGLE_W / 2 - 4, TOGGLE_H - 4, 3)
        .fill(C.controlFill),
    );

    const onText = this.makeText('ON', {
      fontSize: 11,
      fontWeight: '700',
      fill: enabled ? C.buttonText : C.detailValue,
      letterSpacing: 1,
    });
    onText.x = 14;
    onText.y = 5;
    toggle.addChild(onText);

    const offText = this.makeText('OFF', {
      fontSize: 11,
      fontWeight: '700',
      fill: enabled ? C.detailValue : C.buttonText,
      letterSpacing: 1,
    });
    offText.x = 54;
    offText.y = 5;
    toggle.addChild(offText);

    parent.addChild(toggle);
  }

  private createInteractiveContainer(
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

  private makeText(
    text: string,
    style: Partial<ConstructorParameters<typeof TextStyle>[0]>,
  ): Text {
    return new Text({
      text,
      style: new TextStyle({
        fontFamily: FONT,
        fontSize: 12,
        fill: C.detailValue,
        ...style,
      }),
    });
  }

  private onKeyDown(e: KeyboardEvent): void {
    switch (this.page) {
      case 'cartridges':
        this.onCartridgeKeyDown(e);
        break;
      case 'settings':
        this.onSettingsKeyDown(e);
        break;
      case 'video':
        this.onVideoKeyDown(e);
        break;
      case 'sound':
        this.onSoundKeyDown(e);
        break;
      case 'filters':
        this.onFilterKeyDown(e);
        break;
    }
  }

  private onCartridgeKeyDown(e: KeyboardEvent): void {
    switch (e.key) {
      case 'ArrowUp':
      case 'Up':
        e.preventDefault();
        this.moveSelection(-1);
        break;
      case 'ArrowDown':
      case 'Down':
        e.preventDefault();
        this.moveSelection(1);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        this.confirm();
        break;
      case 's':
      case 'S':
        e.preventDefault();
        this.page = 'settings';
        this.render();
        break;
    }
  }

  private onSettingsKeyDown(e: KeyboardEvent): void {
    switch (e.key) {
      case 'ArrowUp':
      case 'Up':
        e.preventDefault();
        this.settingsSelectionId = this.moveInCycle(
          SETTINGS_OPTIONS.map((option) => option.id),
          this.settingsSelectionId,
          -1,
        );
        this.render();
        break;
      case 'ArrowDown':
      case 'Down':
        e.preventDefault();
        this.settingsSelectionId = this.moveInCycle(
          SETTINGS_OPTIONS.map((option) => option.id),
          this.settingsSelectionId,
          1,
        );
        this.render();
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        this.activateSettingsSelection();
        break;
      case 'Escape':
      case 'Backspace':
        e.preventDefault();
        this.page = 'cartridges';
        this.render();
        break;
    }
  }

  private onVideoKeyDown(e: KeyboardEvent): void {
    switch (e.key) {
      case 'ArrowUp':
      case 'Up':
        e.preventDefault();
        this.videoSelectionId = this.moveInCycle(VIDEO_ROW_IDS, this.videoSelectionId, -1);
        this.render();
        break;
      case 'ArrowDown':
      case 'Down':
        e.preventDefault();
        this.videoSelectionId = this.moveInCycle(VIDEO_ROW_IDS, this.videoSelectionId, 1);
        this.render();
        break;
      case 'ArrowLeft':
      case 'Left':
        e.preventDefault();
        this.adjustSelectedVideoValue(-DISPLAY_STEP);
        break;
      case 'ArrowRight':
      case 'Right':
        e.preventDefault();
        this.adjustSelectedVideoValue(DISPLAY_STEP);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        this.activateVideoSelection();
        break;
      case 'Escape':
      case 'Backspace':
        e.preventDefault();
        this.page = 'settings';
        this.settingsSelectionId = 'video';
        this.render();
        break;
    }
  }

  private onFilterKeyDown(e: KeyboardEvent): void {
    switch (e.key) {
      case 'ArrowUp':
      case 'Up':
        e.preventDefault();
        this.filterSelectionId = this.moveInCycle(FILTER_ROW_IDS, this.filterSelectionId, -1);
        this.render();
        break;
      case 'ArrowDown':
      case 'Down':
        e.preventDefault();
        this.filterSelectionId = this.moveInCycle(FILTER_ROW_IDS, this.filterSelectionId, 1);
        this.render();
        break;
      case 'ArrowLeft':
      case 'Left':
        e.preventDefault();
        this.applySelectedFilterValue(false);
        break;
      case 'ArrowRight':
      case 'Right':
        e.preventDefault();
        this.applySelectedFilterValue(true);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        this.toggleFilter(this.filterSelectionId);
        break;
      case 'Escape':
      case 'Backspace':
        e.preventDefault();
        this.page = 'video';
        this.videoSelectionId = 'filters';
        this.render();
        break;
    }
  }

  private onSoundKeyDown(e: KeyboardEvent): void {
    switch (e.key) {
      case 'ArrowUp':
      case 'Up':
        e.preventDefault();
        this.soundSelectionId = this.moveInCycle(SOUND_ROW_IDS, this.soundSelectionId, -1);
        this.render();
        break;
      case 'ArrowDown':
      case 'Down':
        e.preventDefault();
        this.soundSelectionId = this.moveInCycle(SOUND_ROW_IDS, this.soundSelectionId, 1);
        this.render();
        break;
      case 'ArrowLeft':
      case 'Left':
        e.preventDefault();
        this.adjustSelectedSoundValue(-VOLUME_STEP);
        break;
      case 'ArrowRight':
      case 'Right':
        e.preventDefault();
        this.adjustSelectedSoundValue(VOLUME_STEP);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        this.activateSoundSelection();
        break;
      case 'Escape':
      case 'Backspace':
        e.preventDefault();
        this.page = 'settings';
        this.settingsSelectionId = 'sound';
        this.render();
        break;
    }
  }

  private moveSelection(delta: number): void {
    const next = Math.max(0, Math.min(this.manifests.length - 1, this.selectedIndex + delta));
    if (next === this.selectedIndex) {
      return;
    }

    this.selectedIndex = next;
    if (this.selectedIndex < this.scrollOffset) {
      this.scrollOffset = this.selectedIndex;
    } else if (this.selectedIndex >= this.scrollOffset + ITEMS_VISIBLE) {
      this.scrollOffset = this.selectedIndex - ITEMS_VISIBLE + 1;
    }

    this.render();
  }

  private moveInCycle<T extends string>(
    values: readonly T[],
    current: T,
    delta: -1 | 1,
  ): T {
    const currentIndex = Math.max(0, values.indexOf(current));
    const nextIndex = (currentIndex + delta + values.length) % values.length;
    return values[nextIndex] ?? current;
  }

  private activateSettingsSelection(): void {
    switch (this.settingsSelectionId) {
      case 'video':
        this.page = 'video';
        break;
      case 'sound':
        this.page = 'sound';
        break;
      case 'back':
        this.page = 'cartridges';
        break;
      case 'developer':
        break;
    }
    this.render();
  }

  private activateSoundSelection(): void {
    this.adjustSelectedSoundValue(VOLUME_STEP);
  }

  private activateVideoSelection(): void {
    switch (this.videoSelectionId) {
      case 'filters':
        this.page = 'filters';
        break;
      case 'brightness':
      case 'contrast':
        this.adjustVideoValue(this.videoSelectionId, DISPLAY_STEP);
        return;
    }
    this.render();
  }

  private adjustSelectedVideoValue(delta: number): void {
    if (this.videoSelectionId === 'brightness' || this.videoSelectionId === 'contrast') {
      this.adjustVideoValue(this.videoSelectionId, delta);
    }
  }

  private adjustSelectedSoundValue(delta: number): void {
    this.adjustSoundValue(this.soundSelectionId, delta);
  }

  private adjustVideoValue(id: 'brightness' | 'contrast', delta: number): void {
    const nextValue = id === 'brightness'
      ? this.clamp(this.displayProfile.brightness + delta, ROCCO_DISPLAY_BRIGHTNESS_MIN, ROCCO_DISPLAY_BRIGHTNESS_MAX)
      : this.clamp(this.displayProfile.contrast + delta, ROCCO_DISPLAY_CONTRAST_MIN, ROCCO_DISPLAY_CONTRAST_MAX);
    this.updateDisplayProfile({ [id]: nextValue });
  }

  private adjustSoundValue(id: SoundRowId, delta: number): void {
    if (id === 'master') {
      this.updateSoundProfile({
        masterVolume: this.clamp(this.soundProfile.masterVolume + delta, 0, 1),
      });
      return;
    }

    if (id === 'music') {
      this.updateSoundProfile(
        setEffectiveMusicVolume(
          this.soundProfile,
          this.clamp(this.getMusicOutputVolume() + delta, 0, 1),
        ),
      );
      return;
    }

    this.updateSoundProfile(
      setEffectiveSfxVolume(
        this.soundProfile,
        this.clamp(this.getSfxOutputVolume() + delta, 0, 1),
      ),
    );
  }

  private applySelectedFilterValue(enabled: boolean): void {
    this.updateDisplayProfile({ [this.filterSelectionId]: enabled });
  }

  private toggleFilter(id: FilterRowId): void {
    this.updateDisplayProfile({ [id]: !this.displayProfile[id] });
  }

  private updateDisplayProfile(profile: Partial<RoccoDisplayProfile>): void {
    this.displayProfile = resolveRoccoDisplayProfile({
      ...this.displayProfile,
      ...profile,
    });
    this.onDisplayProfileChange?.(this.displayProfile);
    this.render();
  }

  private updateSoundProfile(profile: Partial<RoccoSoundProfile>): void {
    this.soundProfile = resolveRoccoSoundProfile({
      ...this.soundProfile,
      ...profile,
    });
    this.onSoundProfileChange?.(this.soundProfile);
    this.render();
  }

  private confirm(): void {
    const manifest = this.manifests[this.selectedIndex];
    if (!manifest || !this.resolveSelection) {
      return;
    }

    const resolve = this.resolveSelection;
    const selectedLocale = this.getSelectedLocale(manifest);
    this.dispose();
    resolve({ selectedId: manifest.id, selectedLocale });
  }

  private getManifestLocales(manifest: RoccoCartridgeManifest): string[] {
    return ['en', ...Object.keys(manifest.localizations ?? {})];
  }

  private getSelectedLocale(manifest: RoccoCartridgeManifest): string {
    const locales = this.getManifestLocales(manifest);
    const selected = this.selectedLocales.get(manifest.id);
    return selected && locales.includes(selected) ? selected : locales[0] ?? 'en';
  }

  private localizeManifest(manifest: RoccoCartridgeManifest): RoccoCartridgeManifest {
    const locale = this.getSelectedLocale(manifest);
    const localized = locale === 'en' ? undefined : manifest.localizations?.[locale];
    return {
      ...manifest,
      ...localized,
      localizations: manifest.localizations,
    };
  }

  private countEnabledFilters(): number {
    return Number(this.displayProfile.roundedCorners)
      + Number(this.displayProfile.crtMask)
      + Number(this.displayProfile.edgeVignette);
  }

  private getMusicOutputVolume(): number {
    return getEffectiveMusicVolume(this.soundProfile);
  }

  private getSfxOutputVolume(): number {
    return getEffectiveSfxVolume(this.soundProfile);
  }

  private formatPercent(value: number): string {
    return `${Math.round(value * 100)}%`;
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }
}
