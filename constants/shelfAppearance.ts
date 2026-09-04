import type { ImageSourcePropType } from 'react-native';

export type ShelfStyleId = 'classic-oak' | 'floating-oak' | 'carved-walnut';
export type WallpaperStyleId =
  | 'paper-ivory'
  | 'sage-zellige'
  | 'botanical-paper'
  | 'vintage-sprig'
  | 'faded-chintz'
  | 'pressed-botanicals'
  | 'herb-sprigs'
  | 'aged-plaster'
  | 'sage-damask'
  | 'garden-ledger'
  | 'limewash'
  | 'linen-grid'
  | 'charcoal-damask';

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
  'carved-walnut': {
    id: 'carved-walnut',
    name: 'Carved walnut',
    asset: require('../assets/brand/platform/nosh-shelf-carved-walnut-v1.png'),
    assetAspectRatio: 402 / 2163,
    minRenderedHeight: 72,
    maxRenderedHeight: 108,
    sceneMetaHeight: 176,
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
  'vintage-sprig': {
    id: 'vintage-sprig',
    name: 'Vintage sprig',
    asset: require('../assets/brand/wallpapers/nosh-wall-vintage-sprig-v1.png'),
    previewColor: '#D8B77C',
    veilColor: 'rgba(247, 242, 234, 0.14)',
  },
  'faded-chintz': {
    id: 'faded-chintz',
    name: 'Faded chintz',
    asset: require('../assets/brand/wallpapers/nosh-wall-faded-chintz-v1.png'),
    previewColor: '#B28A54',
    veilColor: 'rgba(247, 242, 234, 0.24)',
  },
  'pressed-botanicals': {
    id: 'pressed-botanicals',
    name: 'Pressed herbs',
    asset: require('../assets/brand/wallpapers/nosh-wall-pressed-botanicals-v1.png'),
    previewColor: '#E8D4A8',
    veilColor: 'rgba(247, 242, 234, 0.12)',
  },
  'herb-sprigs': {
    id: 'herb-sprigs',
    name: 'Herb sprigs',
    asset: require('../assets/brand/wallpapers/nosh-wall-herb-sprigs-v1.png'),
    previewColor: '#EDE3CB',
    veilColor: 'rgba(247, 242, 234, 0.08)',
  },
  'aged-plaster': {
    id: 'aged-plaster',
    name: 'Aged plaster',
    asset: require('../assets/brand/wallpapers/nosh-wall-aged-plaster-v1.png'),
    previewColor: '#CBB28C',
    veilColor: 'rgba(247, 242, 234, 0.18)',
  },
  'sage-damask': {
    id: 'sage-damask',
    name: 'Sage damask',
    asset: require('../assets/brand/wallpapers/nosh-wall-sage-damask-v1.png'),
    previewColor: '#7E8975',
    veilColor: 'rgba(247, 242, 234, 0.28)',
  },
  'garden-ledger': {
    id: 'garden-ledger',
    name: 'Garden ledger',
    asset: require('../assets/brand/wallpapers/nosh-wall-garden-ledger-v1.png'),
    previewColor: '#D8B475',
    veilColor: 'rgba(247, 242, 234, 0.16)',
  },
  limewash: {
    id: 'limewash',
    name: 'Limewash',
    asset: require('../assets/brand/wallpapers/nosh-wall-limewash-v1.png'),
    previewColor: '#D8C6A9',
    veilColor: 'rgba(247, 242, 234, 0.12)',
  },
  'linen-grid': {
    id: 'linen-grid',
    name: 'Linen grid',
    asset: require('../assets/brand/wallpapers/nosh-wall-linen-grid-v1.png'),
    previewColor: '#D1A86B',
    veilColor: 'rgba(247, 242, 234, 0.18)',
  },
  'charcoal-damask': {
    id: 'charcoal-damask',
    name: 'Charcoal damask',
    asset: require('../assets/brand/wallpapers/nosh-wall-charcoal-damask-v1.png'),
    previewColor: '#292A21',
    veilColor: 'rgba(247, 242, 234, 0.64)',
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
  return [
    SHELF_STYLE_OPTIONS['classic-oak'],
    SHELF_STYLE_OPTIONS['floating-oak'],
    SHELF_STYLE_OPTIONS['carved-walnut'],
  ];
}

export function getShelfStyle(id: ShelfStyleId): ShelfStyleOption {
  return SHELF_STYLE_OPTIONS[id];
}

export function listWallpaperStyles(): WallpaperStyleOption[] {
  return [
    WALLPAPER_STYLE_OPTIONS['paper-ivory'],
    WALLPAPER_STYLE_OPTIONS['sage-zellige'],
    WALLPAPER_STYLE_OPTIONS['botanical-paper'],
    WALLPAPER_STYLE_OPTIONS['vintage-sprig'],
    WALLPAPER_STYLE_OPTIONS['pressed-botanicals'],
    WALLPAPER_STYLE_OPTIONS['herb-sprigs'],
    WALLPAPER_STYLE_OPTIONS['aged-plaster'],
    WALLPAPER_STYLE_OPTIONS['garden-ledger'],
    WALLPAPER_STYLE_OPTIONS.limewash,
    WALLPAPER_STYLE_OPTIONS['linen-grid'],
    WALLPAPER_STYLE_OPTIONS['charcoal-damask'],
  ];
}

export function getWallpaperStyle(id: WallpaperStyleId): WallpaperStyleOption {
  return WALLPAPER_STYLE_OPTIONS[id];
}
