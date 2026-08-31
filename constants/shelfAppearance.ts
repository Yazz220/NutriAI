import type { ImageSourcePropType } from 'react-native';

export type ShelfStyleId = 'classic-oak' | 'floating-oak';
export type WallpaperStyleId = 'paper-ivory' | 'sage-zellige' | 'botanical-paper';

export interface BookshelfScene {
  shelfStyleId: ShelfStyleId;
  wallpaperStyleId: WallpaperStyleId;
}

export interface ShelfStyleOption {
  id: ShelfStyleId;
  name: string;
  asset: ImageSourcePropType;
  assetAspectRatio: number;
  minRenderedHeight: number;
  maxRenderedHeight: number;
  sceneMetaHeight: number;
}

export interface WallpaperStyleOption {
  id: WallpaperStyleId;
  name: string;
  asset?: ImageSourcePropType;
  previewColor: string;
  veilColor?: string;
}

export const SHELF_STYLE_OPTIONS: Record<ShelfStyleId, ShelfStyleOption> = {
  'classic-oak': {
    id: 'classic-oak',
    name: 'Classic oak',
    asset: require('../assets/brand/platform/nosh-shelf-classic-v2.png'),
    assetAspectRatio: 411 / 2128,
    minRenderedHeight: 72,
    maxRenderedHeight: 108,
    sceneMetaHeight: 176,
  },
  'floating-oak': {
    id: 'floating-oak',
    name: 'Floating oak',
    asset: require('../assets/brand/platform/nosh-shelf-board-v1.png'),
    assetAspectRatio: 153 / 1982,
    minRenderedHeight: 30,
    maxRenderedHeight: 30,
    sceneMetaHeight: 96,
  },
};

export const DEFAULT_BOOKSHELF_SCENE: BookshelfScene = {
  shelfStyleId: 'classic-oak',
  wallpaperStyleId: 'paper-ivory',
};

export const WALLPAPER_STYLE_OPTIONS: Record<WallpaperStyleId, WallpaperStyleOption> = {
  'paper-ivory': {
    id: 'paper-ivory',
    name: 'Paper ivory',
    previewColor: '#F7F2EA',
  },
  'sage-zellige': {
    id: 'sage-zellige',
    name: 'Sage tile',
    asset: require('../assets/brand/wallpapers/nosh-wall-sage-zellige-v1.png'),
    previewColor: '#CAD4BD',
    veilColor: 'rgba(247, 242, 234, 0.12)',
  },
  'botanical-paper': {
    id: 'botanical-paper',
    name: 'Herb paper',
    asset: require('../assets/brand/wallpapers/nosh-wall-botanical-paper-v1.png'),
    previewColor: '#F7F2EA',
    veilColor: 'rgba(247, 242, 234, 0.08)',
  },
};

const SHELF_STYLE_IDS = new Set<string>(Object.keys(SHELF_STYLE_OPTIONS));
const WALLPAPER_STYLE_IDS = new Set<string>(Object.keys(WALLPAPER_STYLE_OPTIONS));

export function isShelfStyleId(value: unknown): value is ShelfStyleId {
  return typeof value === 'string' && SHELF_STYLE_IDS.has(value);
}

export function isWallpaperStyleId(value: unknown): value is WallpaperStyleId {
  return typeof value === 'string' && WALLPAPER_STYLE_IDS.has(value);
}

export function listShelfStyles(): ShelfStyleOption[] {
  return [SHELF_STYLE_OPTIONS['classic-oak'], SHELF_STYLE_OPTIONS['floating-oak']];
}

export function getShelfStyle(id: ShelfStyleId): ShelfStyleOption {
  return SHELF_STYLE_OPTIONS[id];
}

export function listWallpaperStyles(): WallpaperStyleOption[] {
  return [
    WALLPAPER_STYLE_OPTIONS['paper-ivory'],
    WALLPAPER_STYLE_OPTIONS['sage-zellige'],
    WALLPAPER_STYLE_OPTIONS['botanical-paper'],
  ];
}

export function getWallpaperStyle(id: WallpaperStyleId): WallpaperStyleOption {
  return WALLPAPER_STYLE_OPTIONS[id];
}
