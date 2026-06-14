import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { RoccoCartridgeManifest } from '../cartridges/types';

// ─── Layout constants (design space: 960×540) ────────────────────────────────
const DESIGN_W = 960;
const DESIGN_H = 540;

const HEADER_H = 90;
const FOOTER_H = 52;
const LIST_TOP = HEADER_H + 16;
const LIST_BOTTOM = DESIGN_H - FOOTER_H - 8;
const LIST_H = LIST_BOTTOM - LIST_TOP;

const ITEM_H = 64;
const ITEM_MARGIN = 6;
const ITEM_STRIDE = ITEM_H + ITEM_MARGIN;
const ITEMS_VISIBLE = Math.floor(LIST_H / ITEM_STRIDE); // ~6

const LIST_X = 60;
const LIST_W = DESIGN_W - LIST_X * 2;

const DETAIL_X = LIST_X + LIST_W * 0.55;
const DETAIL_W = LIST_W - (DETAIL_X - LIST_X) - 8;

// ─── Colour palette ──────────────────────────────────────────────────────────
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
  scrollBar: 0x2a3f28,
  scrollThumb: 0x4a7040,
  detailLabel: 0x4a6b42,
  detailValue: 0xb0c8a8,
  footer: 0x3a5038,
  footerHint: 0x5a7055,
  scanline: 0x000000,
} as const;

const FONT = 'Cascadia Mono, Lucida Console, monospace';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CartridgeMenuResult {
  selectedId: string;
  selectedLocale?: string;
}

export interface CartridgeMenuOptions {
  initialLocales?: Record<string, string>;
}

// ─── Main class ──────────────────────────────────────────────────────────────

export class RoccoCartridgeMenu {
  private readonly stage: Container;
  private manifests: RoccoCartridgeManifest[] = [];
  private selectedLocales = new Map<string, string>();

  private scrollOffset = 0;
  private selectedIndex = 0;

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
  }

  // ─── Mounting ──────────────────────────────────────────────────────────────

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
    if (this.root) {
      this.stage.removeChild(this.root);
      this.root.destroy({ children: true });
      this.root = null;
    }
  }

  // ─── Rendering ─────────────────────────────────────────────────────────────

  private render(): void {
    if (!this.root) return;

    // Clear and rebuild
    this.root.removeChildren().forEach((c) => c.destroy({ children: true }));

    this.drawBackground();
    this.drawHeader();
    this.drawList();
    this.drawDetail();
    this.drawScrollBar();
    this.drawFooter();
  }

  private drawBackground(): void {
    const root = this.root!;

    // Solid fill
    const bg = new Graphics()
      .rect(0, 0, DESIGN_W, DESIGN_H)
      .fill(C.bg);
    root.addChild(bg);

    // Horizontal scan lines (every 4px, very subtle)
    const scanlines = new Graphics();
    for (let y = 0; y < DESIGN_H; y += 4) {
      scanlines.rect(0, y, DESIGN_W, 1).fill({ color: C.scanline, alpha: 0.18 });
    }
    root.addChild(scanlines);

    // Vertical divider between list and detail
    const divider = new Graphics()
      .rect(DETAIL_X - 16, LIST_TOP, 1, LIST_H)
      .fill({ color: C.bgLine, alpha: 0.9 });
    root.addChild(divider);
  }

  private drawHeader(): void {
    const root = this.root!;

    // Header background strip
    const headerBg = new Graphics()
      .rect(0, 0, DESIGN_W, HEADER_H)
      .fill({ color: 0x0a0f09, alpha: 1 });
    root.addChild(headerBg);

    const headerLine = new Graphics()
      .rect(0, HEADER_H - 1, DESIGN_W, 1)
      .fill({ color: C.titleBrand, alpha: 0.25 });
    root.addChild(headerLine);

    // Brand title
    const brand = new Text({
      text: 'ROCCO',
      style: new TextStyle({
        fontFamily: FONT,
        fontSize: 42,
        fontWeight: '700',
        fill: C.titleBrand,
        letterSpacing: 8,
      }),
    });
    brand.x = LIST_X;
    brand.y = 18;
    root.addChild(brand);

    // Sub title
    const sub = new Text({
      text: 'SELECT CARTRIDGE',
      style: new TextStyle({
        fontFamily: FONT,
        fontSize: 13,
        fontWeight: '400',
        fill: C.titleSub,
        letterSpacing: 4,
      }),
    });
    sub.x = LIST_X + 4;
    sub.y = 66;
    root.addChild(sub);

    // Count
    const count = new Text({
      text: `${this.manifests.length} CARTRIDGE${this.manifests.length !== 1 ? 'S' : ''} AVAILABLE`,
      style: new TextStyle({
        fontFamily: FONT,
        fontSize: 11,
        fill: C.titleSub,
        letterSpacing: 2,
      }),
    });
    count.x = DESIGN_W - LIST_X - count.width;
    count.y = 70;
    root.addChild(count);
  }

  private drawList(): void {
    const root = this.root!;
    const listW = DETAIL_X - LIST_X - 24;

    const container = new Container();
    container.label = 'list';
    root.addChild(container);

    const visibleCount = Math.min(ITEMS_VISIBLE, this.manifests.length);

    for (let i = 0; i < visibleCount; i++) {
      const dataIndex = this.scrollOffset + i;
      if (dataIndex >= this.manifests.length) break;

      const manifest = this.localizeManifest(this.manifests[dataIndex]);
      const isSelected = dataIndex === this.selectedIndex;
      const y = LIST_TOP + i * ITEM_STRIDE;

      this.drawListItem(container, manifest, y, listW, isSelected, dataIndex);
    }
  }

  private drawListItem(
    container: Container,
    manifest: RoccoCartridgeManifest,
    y: number,
    w: number,
    selected: boolean,
    dataIndex: number,
  ): void {
    const x = LIST_X;

    // Interactive container for the entire item
    const itemContainer = new Container();
    itemContainer.eventMode = 'static';
    itemContainer.hitArea = {
      contains: (px: number, py: number) => px >= x && px <= x + w && py >= y && py <= y + ITEM_H
    };
    
    // Click to select
    itemContainer.on('pointerdown', () => {
      this.selectedIndex = dataIndex;
      this.render();
    });

    // Background
    const bgColor = selected ? C.itemBgSelected : C.itemBg;
    const borderColor = selected ? C.itemBorderSelected : C.itemBorder;

    const bg = new Graphics()
      .rect(x, y, w, ITEM_H)
      .fill(bgColor)
      .rect(x, y, w, ITEM_H)
      .stroke({ color: borderColor, width: selected ? 1.5 : 1 });
    itemContainer.addChild(bg);

    // Selection indicator bar on left
    if (selected) {
      const bar = new Graphics()
        .rect(x, y + 4, 3, ITEM_H - 8)
        .fill(C.itemBorderSelected);
      itemContainer.addChild(bar);
    }

    // Cartridge title
    const titleText = new Text({
      text: manifest.title.toUpperCase(),
      style: new TextStyle({
        fontFamily: FONT,
        fontSize: 18,
        fontWeight: selected ? '700' : '400',
        fill: selected ? C.itemTitleSelected : C.itemTitle,
        letterSpacing: 2,
      }),
    });
    titleText.x = x + 16;
    titleText.y = y + 10;
    itemContainer.addChild(titleText);

    // Author / genre sub line
    const parts: string[] = [];
    if (manifest.author) parts.push(manifest.author);
    if (manifest.genre) parts.push(manifest.genre);
    if (manifest.releaseYear) parts.push(String(manifest.releaseYear));
    const subLine = parts.join('  ·  ');

    if (subLine) {
      const sub = new Text({
        text: subLine,
        style: new TextStyle({
          fontFamily: FONT,
          fontSize: 11,
          fill: C.itemSub,
          letterSpacing: 1,
        }),
      });
      sub.x = x + 16;
      sub.y = y + 36;
      itemContainer.addChild(sub);
    }

    // Version
    const ver = new Text({
      text: `v${manifest.version}`,
      style: new TextStyle({
        fontFamily: FONT,
        fontSize: 10,
        fill: C.itemSub,
      }),
    });
    ver.x = x + w - ver.width - 12;
    ver.y = y + ITEM_H - ver.height - 8;
    itemContainer.addChild(ver);

    container.addChild(itemContainer);
  }

  private drawDetail(): void {
    const root = this.root!;
    const manifest = this.manifests[this.selectedIndex];
    if (!manifest) return;
    const localizedManifest = this.localizeManifest(manifest);

    const container = new Container();
    container.label = 'detail';
    root.addChild(container);

    let cy = LIST_TOP + 8;
    const lx = DETAIL_X;

    // Title
    const title = new Text({
      text: localizedManifest.title.toUpperCase(),
      style: new TextStyle({
        fontFamily: FONT,
        fontSize: 22,
        fontWeight: '700',
        fill: C.titleBrand,
        letterSpacing: 3,
        wordWrap: true,
        wordWrapWidth: DETAIL_W,
      }),
    });
    title.x = lx;
    title.y = cy;
    container.addChild(title);
    cy += title.height + 12;

    // Description
    if (localizedManifest.description) {
      const desc = new Text({
        text: localizedManifest.description,
        style: new TextStyle({
          fontFamily: FONT,
          fontSize: 12,
          fill: C.detailValue,
          wordWrap: true,
          wordWrapWidth: DETAIL_W,
          leading: 6,
        }),
      });
      desc.x = lx;
      desc.y = cy;
      container.addChild(desc);
      cy += desc.height + 20;
    }

    // Separator
    const sep = new Graphics()
      .rect(lx, cy, DETAIL_W, 1)
      .fill({ color: C.bgLine, alpha: 1 });
    container.addChild(sep);
    cy += 14;

    // Field rows
    const fields: Array<[string, string | undefined]> = [
      ['PUBLISHER', localizedManifest.publisher ?? localizedManifest.author],
      [
        'YEAR',
        localizedManifest.releaseYear !== undefined
          ? String(localizedManifest.releaseYear)
          : undefined,
      ],
      ['GENRE', localizedManifest.genre],
      ['PLAYERS', localizedManifest.players],
      ['VERSION', localizedManifest.version],
      ['ID', localizedManifest.id],
    ];

    for (const [label, value] of fields) {
      if (!value) continue;

      const labelText = new Text({
        text: label,
        style: new TextStyle({
          fontFamily: FONT,
          fontSize: 10,
          fill: C.detailLabel,
          letterSpacing: 2,
        }),
      });
      labelText.x = lx;
      labelText.y = cy;
      container.addChild(labelText);

      const valueText = new Text({
        text: value,
        style: new TextStyle({
          fontFamily: FONT,
          fontSize: 12,
          fill: C.detailValue,
          letterSpacing: 1,
        }),
      });
      valueText.x = lx + 100;
      valueText.y = cy;
      container.addChild(valueText);

      cy += 22;
    }

    // Tags
    cy = this.drawLocaleOptions(container, manifest, lx, cy);

    if (localizedManifest.tags && localizedManifest.tags.length > 0) {
      cy += 8;
      const tagsLabel = new Text({
        text: 'TAGS',
        style: new TextStyle({
          fontFamily: FONT,
          fontSize: 10,
          fill: C.detailLabel,
          letterSpacing: 2,
        }),
      });
      tagsLabel.x = lx;
      tagsLabel.y = cy;
      container.addChild(tagsLabel);

      const tagsValue = new Text({
        text: localizedManifest.tags.join('  '),
        style: new TextStyle({
          fontFamily: FONT,
          fontSize: 10,
          fill: C.itemSub,
          letterSpacing: 1,
          wordWrap: true,
          wordWrapWidth: DETAIL_W,
        }),
      });
      tagsValue.x = lx;
      tagsValue.y = cy + 16;
      container.addChild(tagsValue);
      cy += 16 + tagsValue.height + 20;
    } else {
      cy += 16;
    }

    // LOAD Button (at the end)
    const buttonW = 100;
    const buttonH = 30;
    const buttonContainer = new Container();
    buttonContainer.eventMode = 'static';
    buttonContainer.hitArea = {
      contains: (px: number, py: number) => px >= lx && px <= lx + buttonW && py >= cy && py <= cy + buttonH
    };
    buttonContainer.on('pointerdown', () => this.confirm());

    const buttonBg = new Graphics()
      .roundRect(lx, cy, buttonW, buttonH, 4)
      .fill(C.itemBorderSelected)
      .roundRect(lx, cy, buttonW, buttonH, 4)
      .stroke({ color: C.titleBrand, width: 2 });
    buttonContainer.addChild(buttonBg);

    const buttonText = new Text({
      text: 'LOAD',
      style: new TextStyle({
        fontFamily: FONT,
        fontSize: 14,
        fontWeight: '700',
        fill: 0x0d110c,
        letterSpacing: 3,
      }),
    });
    buttonText.x = lx + (buttonW - buttonText.width) / 2;
    buttonText.y = cy + (buttonH - buttonText.height) / 2;
    buttonContainer.addChild(buttonText);

    container.addChild(buttonContainer);
  }

  private drawScrollBar(): void {
    if (this.manifests.length <= ITEMS_VISIBLE) return;

    const root = this.root!;
    const scrollContainer = new Container();
    root.addChild(scrollContainer);
    const barX = LIST_X - 12;
    const barH = LIST_H;
    const barY = LIST_TOP;

    // Track
    const track = new Graphics()
      .rect(barX, barY, 4, barH)
      .fill(C.scrollBar);
    scrollContainer.addChild(track);

    // Thumb
    const thumbH = Math.max(20, (ITEMS_VISIBLE / this.manifests.length) * barH);
    const maxScroll = this.manifests.length - ITEMS_VISIBLE;
    const thumbY = barY + (this.scrollOffset / maxScroll) * (barH - thumbH);

    const thumb = new Graphics()
      .rect(barX, thumbY, 4, thumbH)
      .fill(C.scrollThumb);
    scrollContainer.addChild(thumb);

    // Arrow Up (clickable)
    const arrowUpContainer = new Container();
    arrowUpContainer.eventMode = 'static';
    
    const arrowUpBg = new Graphics()
      .rect(barX - 4, barY - 18, 16, 16)
      .fill({ color: 0x000000, alpha: 0.01 });
    arrowUpContainer.addChild(arrowUpBg);

    const arrowUp = new Text({
      text: '▲',
      style: new TextStyle({ fontFamily: FONT, fontSize: 10, fill: this.scrollOffset > 0 ? C.titleBrand : C.scrollBar }),
    });
    arrowUp.x = barX - 1;
    arrowUp.y = barY - 14;
    arrowUpContainer.addChild(arrowUp);

    arrowUpContainer.on('pointerdown', () => {
      if (this.scrollOffset > 0) {
        this.scrollOffset--;
        this.render();
      }
    });

    scrollContainer.addChild(arrowUpContainer);

    // Arrow Down (clickable)
    const arrowDownContainer = new Container();
    arrowDownContainer.eventMode = 'static';
    
    const arrowDownBg = new Graphics()
      .rect(barX - 4, barY + barH + 2, 16, 16)
      .fill({ color: 0x000000, alpha: 0.01 });
    arrowDownContainer.addChild(arrowDownBg);

    const arrowDown = new Text({
      text: '▼',
      style: new TextStyle({ fontFamily: FONT, fontSize: 10, fill: this.scrollOffset < maxScroll ? C.titleBrand : C.scrollBar }),
    });
    arrowDown.x = barX - 1;
    arrowDown.y = barY + barH + 2;
    arrowDownContainer.addChild(arrowDown);

    arrowDownContainer.on('pointerdown', () => {
      if (this.scrollOffset < maxScroll) {
        this.scrollOffset++;
        this.render();
      }
    });

    scrollContainer.addChild(arrowDownContainer);
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
    const label = new Text({
      text: 'LANGUAGE',
      style: new TextStyle({
        fontFamily: FONT,
        fontSize: 10,
        fill: C.detailLabel,
        letterSpacing: 2,
      }),
    });
    label.x = x;
    label.y = y;
    container.addChild(label);

    let optionX = x + 100;
    for (const locale of locales) {
      const isSelected = locale === selectedLocale;
      const optionContainer = new Container();
      optionContainer.x = optionX;
      optionContainer.y = y - 2;
      optionContainer.eventMode = 'static';
      optionContainer.hitArea = {
        contains: (px: number, py: number) => px >= 0 && px <= 54 && py >= 0 && py <= 22,
      };
      optionContainer.on('pointerdown', () => {
        this.selectedLocales.set(manifest.id, locale);
        this.render();
      });

      optionContainer.addChild(
        new Graphics().rect(0, 0, 54, 22).fill({ color: 0x000000, alpha: 0.01 }),
      );
      const radio = new Graphics()
        .circle(7, 9, 6)
        .stroke({ color: isSelected ? C.titleBrand : C.detailLabel, width: 1.5 });
      optionContainer.addChild(radio);

      if (isSelected) {
        optionContainer.addChild(new Graphics().circle(7, 9, 3).fill(C.titleBrand));
      }

      const optionLabel = new Text({
        text: locale.toUpperCase(),
        style: new TextStyle({
          fontFamily: FONT,
          fontSize: 12,
          fill: isSelected ? C.titleBrand : C.detailValue,
          letterSpacing: 1,
        }),
      });
      optionLabel.x = 18;
      optionLabel.y = 2;
      optionContainer.addChild(optionLabel);
      container.addChild(optionContainer);

      optionX += 58;
    }

    return y + 28;
  }

  private drawFooter(): void {
    const root = this.root!;

    const footerY = DESIGN_H - FOOTER_H;

    const footerBg = new Graphics()
      .rect(0, footerY, DESIGN_W, FOOTER_H)
      .fill({ color: 0x0a0f09, alpha: 1 });
    root.addChild(footerBg);

    const footerLine = new Graphics()
      .rect(0, footerY, DESIGN_W, 1)
      .fill({ color: C.titleBrand, alpha: 0.2 });
    root.addChild(footerLine);

    const hints: Array<[string, string]> = [
      ['↑ ↓', 'NAVIGATE'],
      ['ENTER', 'LOAD'],
    ];

    let hx = LIST_X;
    for (const [key, label] of hints) {
      const keyText = new Text({
        text: key,
        style: new TextStyle({ fontFamily: FONT, fontSize: 13, fontWeight: '700', fill: C.titleBrand, letterSpacing: 1 }),
      });
      keyText.x = hx;
      keyText.y = footerY + 16;
      root.addChild(keyText);

      const labelText = new Text({
        text: `  ${label}`,
        style: new TextStyle({ fontFamily: FONT, fontSize: 13, fill: C.footerHint, letterSpacing: 2 }),
      });
      labelText.x = hx + keyText.width;
      labelText.y = footerY + 16;
      root.addChild(labelText);

      hx += keyText.width + labelText.width + 32;
    }
  }

  // ─── Input ─────────────────────────────────────────────────────────────────

  private onKeyDown(e: KeyboardEvent): void {
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
    }
  }

  private moveSelection(delta: number): void {
    const next = Math.max(0, Math.min(this.manifests.length - 1, this.selectedIndex + delta));
    if (next === this.selectedIndex) return;
    this.selectedIndex = next;

    // Scroll to keep selection visible
    if (this.selectedIndex < this.scrollOffset) {
      this.scrollOffset = this.selectedIndex;
    } else if (this.selectedIndex >= this.scrollOffset + ITEMS_VISIBLE) {
      this.scrollOffset = this.selectedIndex - ITEMS_VISIBLE + 1;
    }

    this.render();
  }

  private confirm(): void {
    const manifest = this.manifests[this.selectedIndex];
    if (!manifest || !this.resolveSelection) return;

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
}
