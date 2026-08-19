import { matchFont, PaintStyle, Skia, type SkCanvas, type SkFont, type SkImage, type SkPaint } from '@shopify/react-native-skia';
import { Colors } from '@/constants/colors';
import { getCookbookStyle } from '@/constants/cookbookStyles';
import type { Cookbook, CookbookPage } from '@/types/cookbook';
import type { CookbookLeaf } from '@/utils/cookbook/reader';

/**
 * Generates a Skia-rendered texture image for non-recipe leaves (bookplate,
 * contents, blank) so they turn with visible content instead of blank cream.
 *
 * Uses an offscreen Skia surface to draw the page content, then snapshots it
 * to a SkImage that can be used as the curl mesh texture in TurningLeafSkia.
 *
 * Text uses the system default font (Skia.Font() with no typeface) — it won't
 * match the app's Inter/editorial-serif exactly, but it's readable and gives
 * the turning page real content rather than a blank surface.
 */

const TEXT_COLOR = Colors.book.ink;
const CAPTION_COLOR = Colors.book.caption;
const EDGE_COLOR = Colors.book.edgeStrong;

function makeFillPaint(color: string): SkPaint {
  const paint = Skia.Paint();
  paint.setColor(Skia.Color(color));
  paint.setAntiAlias(true);
  paint.setStyle(PaintStyle.Fill);
  return paint;
}

function makeStrokePaint(color: string, strokeWidth: number): SkPaint {
  const paint = Skia.Paint();
  paint.setColor(Skia.Color(color));
  paint.setAntiAlias(true);
  paint.setStyle(PaintStyle.Stroke);
  paint.setStrokeWidth(strokeWidth);
  return paint;
}

/**
 * Creates a SkFont at the given size using the system default typeface.
 * Skia.Font(undefined/null, size) crashes the native JSI binding because it
 * expects a Typeface HostObject. matchFont resolves a real system typeface
 * via FontMgr.System().matchFamilyStyle('System', ...) and is the library's
 * own internal pattern for default fonts.
 */
function makeFont(size: number, weight: 'normal' | 'bold' = 'normal'): SkFont {
  return matchFont({ fontFamily: 'System', fontSize: size, fontWeight: weight });
}

function drawCenteredText(
  canvas: SkCanvas,
  text: string,
  centerX: number,
  y: number,
  font: ReturnType<typeof Skia.Font>,
  paint: SkPaint,
): void {
  const textWidth = font.measureText(text).width;
  canvas.drawText(text, centerX - textWidth / 2, y, paint, font);
}

function drawBookplate(
  canvas: SkCanvas,
  width: number,
  height: number,
  cookbook: Cookbook | null,
  pageCount: number,
): void {
  const preset = getCookbookStyle(cookbook?.coverStyle);
  const accent = preset.palette.accent;
  const ink = preset.palette.ink;

  // Background
  canvas.drawRect(Skia.XYWHRect(0, 0, width, height), makeFillPaint(Colors.book.pageAlt));

  // Frame border
  const insetX = width * 0.08;
  const insetY = height * 0.08;
  canvas.drawRect(
    Skia.XYWHRect(insetX, insetY, width - 2 * insetX, height - 2 * insetY),
    makeStrokePaint(accent, 1.5),
  );

  const centerX = width / 2;

  // Kicker text above title
  const kickerFont = makeFont(Math.max(7, width * 0.025));
  drawCenteredText(canvas, 'A PERSONAL COOKBOOK', centerX, height * 0.4, kickerFont, makeFillPaint(CAPTION_COLOR));

  // Title text
  const titleFont = makeFont(Math.max(14, width * 0.06), 'bold');
  const title = cookbook?.title ?? 'My Cookbook';
  drawCenteredText(canvas, title, centerX, height * 0.5, titleFont, makeFillPaint(ink));

  // Horizontal rule below title
  const ruleY = height * 0.58;
  const ruleWidth = width * 0.12;
  canvas.drawLine(centerX - ruleWidth / 2, ruleY, centerX + ruleWidth / 2, ruleY, makeStrokePaint(accent, 1));

  // Recipe count
  const metaFont = makeFont(Math.max(7, width * 0.025));
  const meta = pageCount === 1 ? 'ONE RECIPE' : `${pageCount} RECIPES`;
  drawCenteredText(canvas, meta, centerX, height * 0.64, metaFont, makeFillPaint(CAPTION_COLOR));
}

function drawContents(
  canvas: SkCanvas,
  width: number,
  height: number,
  pages: CookbookPage[],
): void {
  // Background
  canvas.drawRect(Skia.XYWHRect(0, 0, width, height), makeFillPaint(Colors.book.page));

  // Header
  const headerFont = makeFont(Math.max(12, width * 0.05), 'bold');
  canvas.drawText('Contents', width * 0.1, height * 0.12, makeFillPaint(TEXT_COLOR), headerFont);

  // Header rule
  canvas.drawLine(width * 0.1, height * 0.15, width * 0.9, height * 0.15, makeStrokePaint(EDGE_COLOR, 0.8));

  // Entry rows
  const entryFont = makeFont(Math.max(8, width * 0.03));
  const numberFont = makeFont(Math.max(7, width * 0.025));
  const entryPaint = makeFillPaint(TEXT_COLOR);
  const numberPaint = makeFillPaint(CAPTION_COLOR);

  const entriesTop = height * 0.22;
  const entriesBottom = height * 0.92;
  const availableHeight = entriesBottom - entriesTop;
  const maxEntries = Math.min(pages.length, Math.floor(availableHeight / (width * 0.06)));
  const rowHeight = availableHeight / Math.max(maxEntries, 1);

  for (let i = 0; i < maxEntries; i += 1) {
    const page = pages[i];
    if (!page) continue;
    const y = entriesTop + rowHeight * (i + 0.7);

    // Entry title (truncated to fit)
    const title = page.title.length > 28 ? `${page.title.slice(0, 27)}…` : page.title;
    canvas.drawText(title, width * 0.1, y, entryPaint, entryFont);

    // Page number on the right
    const pageNum = String(page.pageNumber ?? i + 1);
    const numWidth = numberFont.measureText(pageNum).width;
    canvas.drawText(pageNum, width * 0.9 - numWidth, y, numberPaint, numberFont);

    // Thin separator line between entries
    if (i < maxEntries - 1) {
      canvas.drawLine(
        width * 0.1,
        y + rowHeight * 0.35,
        width * 0.9,
        y + rowHeight * 0.35,
        makeStrokePaint(EDGE_COLOR, 0.4),
      );
    }
  }
}

function drawBlank(canvas: SkCanvas, width: number, height: number): void {
  canvas.drawRect(Skia.XYWHRect(0, 0, width, height), makeFillPaint(Colors.book.pageAlt));
}

/**
 * Creates a SkImage texture for a non-recipe leaf. Returns null for recipe
 * leaves (they use their own page image) or if the surface can't be created.
 */
export function createLeafTexture(
  leaf: CookbookLeaf,
  width: number,
  height: number,
  cookbook: Cookbook | null,
  pages: CookbookPage[],
): SkImage | null {
  if (leaf.type === 'recipe') return null;

  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  const surface = Skia.Surface.Make(w, h);
  if (!surface) return null;

  const canvas = surface.getCanvas();

  if (leaf.type === 'bookplate') {
    drawBookplate(canvas, w, h, cookbook, pages.length);
  } else if (leaf.type === 'contents') {
    drawContents(canvas, w, h, pages);
  } else {
    drawBlank(canvas, w, h);
  }

  return surface.makeImageSnapshot();
}
