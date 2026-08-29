import { Colors } from '@/constants/colors';

/**
 * Product-owned material measurements for the canonical Nosh cookbook.
 *
 * Geometry defines the trimmed 4:5 leaf. This contract defines the physical
 * object around it: cloth-covered boards, hinge, page block, paper, and the
 * shared light treatment. Cover color and title remain skin-level choices.
 */
export const NOSH_BOOK_MATERIAL = {
  id: 'nosh-clothbound-v1',
  revision: 1,
  cover: {
    cornerRadiusRatio: 0.052,
    cornerRadiusMin: 8,
    cornerRadiusMax: 16,
    hingeWidthRatio: 0.068,
    hingeWidthMin: 10,
    hingeWidthMax: 18,
    boardDepthRatio: 0.018,
    boardDepthMin: 2,
    boardDepthMax: 5,
  },
  pageBlock: {
    insetRatio: 0.018,
    insetMin: 2,
    insetMax: 5,
    depthRatio: 0.032,
    depthPerPage: 0.08,
    depthMin: 7,
    depthMaxRatio: 0.085,
    cornerRadiusRatio: 0.032,
    cornerRadiusMin: 4,
    cornerRadiusMax: 9,
    striationCount: 7,
  },
  paper: {
    face: Colors.book.page,
    faceAlt: Colors.book.pageAlt,
    edge: '#e3ddcf',
    edgeShade: '#bcb2a1',
    edgeHighlight: '#f8f3e8',
  },
  light: {
    ambientShadow: 'rgba(35, 33, 28, 0.14)',
    contactShadow: 'rgba(35, 33, 28, 0.28)',
    coverHighlight: 'rgba(255, 252, 244, 0.2)',
    coverShade: 'rgba(23, 22, 20, 0.16)',
    gutterShade: 'rgba(72, 61, 47, 0.16)',
    gutterCore: 'rgba(45, 38, 29, 0.2)',
  },
} as const;

export interface NoshBookMaterialGeometry {
  boardCornerRadius: number;
  boardDepth: number;
  hingeWidth: number;
  pageBlockDepth: number;
  pageBlockInset: number;
  pageCornerRadius: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function resolveNoshBookMaterialGeometry(width: number, pageCount = 12): NoshBookMaterialGeometry {
  const safeWidth = Math.max(1, width);
  const safePageCount = Math.max(0, pageCount);
  const { cover, pageBlock } = NOSH_BOOK_MATERIAL;

  return {
    boardCornerRadius: clamp(safeWidth * cover.cornerRadiusRatio, cover.cornerRadiusMin, cover.cornerRadiusMax),
    boardDepth: clamp(safeWidth * cover.boardDepthRatio, cover.boardDepthMin, cover.boardDepthMax),
    hingeWidth: clamp(safeWidth * cover.hingeWidthRatio, cover.hingeWidthMin, cover.hingeWidthMax),
    pageBlockDepth: clamp(
      safeWidth * pageBlock.depthRatio + safePageCount * pageBlock.depthPerPage,
      pageBlock.depthMin,
      safeWidth * pageBlock.depthMaxRatio,
    ),
    pageBlockInset: clamp(safeWidth * pageBlock.insetRatio, pageBlock.insetMin, pageBlock.insetMax),
    pageCornerRadius: clamp(
      safeWidth * pageBlock.cornerRadiusRatio,
      pageBlock.cornerRadiusMin,
      pageBlock.cornerRadiusMax,
    ),
  };
}
