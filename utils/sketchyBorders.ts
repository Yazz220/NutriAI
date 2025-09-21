/**
 * SVG Border Generation Utilities for Hand-Drawn UI Theme
 * 
 * Generates irregular, sketchy border paths that mimic hand-drawn lines
 */

export interface BorderPathConfig {
  width: number;
  height: number;
  borderRadius: number;
  roughness: number; // 0-1, controls irregularity
  seed?: number; // For consistent randomization
  borderWidth?: number;
}

export interface Point {
  x: number;
  y: number;
}

/**
 * Seeded random number generator for consistent results
 */
class SeededRandom {
  private seed: number;

  constructor(seed: number = Math.random()) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
}

/**
 * Generates SVG path strings for irregular, hand-drawn borders
 */
export class BorderPathGenerator {
  /**
   * Adds roughness to a point by applying random offset
   */
  private static roughenPoint(
    point: Point, 
    roughness: number, 
    rng: SeededRandom
  ): Point {
    const maxOffset = roughness * 3; // Maximum pixel offset
    return {
      x: point.x + rng.range(-maxOffset, maxOffset),
      y: point.y + rng.range(-maxOffset, maxOffset),
    };
  }

  /**
   * Generates points along a line with roughness applied
   */
  private static generateRoughLine(
    start: Point,
    end: Point,
    segments: number,
    roughness: number,
    rng: SeededRandom
  ): Point[] {
    const points: Point[] = [];
    
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const point = {
        x: start.x + (end.x - start.x) * t,
        y: start.y + (end.y - start.y) * t,
      };
      
      // Apply roughness, but keep start and end points more stable
      const pointRoughness = i === 0 || i === segments ? roughness * 0.3 : roughness;
      points.push(this.roughenPoint(point, pointRoughness, rng));
    }
    
    return points;
  }

  /**
   * Generates a rough arc for rounded corners
   */
  private static generateRoughArc(
    center: Point,
    radius: number,
    startAngle: number,
    endAngle: number,
    segments: number,
    roughness: number,
    rng: SeededRandom
  ): Point[] {
    const points: Point[] = [];
    const angleStep = (endAngle - startAngle) / segments;
    
    for (let i = 0; i <= segments; i++) {
      const angle = startAngle + angleStep * i;
      const point = {
        x: center.x + Math.cos(angle) * radius,
        y: center.y + Math.sin(angle) * radius,
      };
      
      points.push(this.roughenPoint(point, roughness, rng));
    }
    
    return points;
  }

  /**
   * Converts points array to SVG path string
   */
  private static pointsToPath(points: Point[]): string {
    if (points.length === 0) return '';
    
    let path = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
    
    for (let i = 1; i < points.length; i++) {
      path += ` L ${points[i].x.toFixed(2)} ${points[i].y.toFixed(2)}`;
    }
    
    return path;
  }

  /**
   * Generates a rectangular border path with roughness
   */
  static generateRectPath(config: BorderPathConfig): string {
    const { width, height, roughness, seed = Math.random() } = config;
    const rng = new SeededRandom(seed);
    const segments = Math.max(8, Math.floor((width + height) / 20)); // Adaptive segments
    
    const allPoints: Point[] = [];
    
    // Top edge
    const topPoints = this.generateRoughLine(
      { x: 0, y: 0 },
      { x: width, y: 0 },
      Math.floor(segments * (width / (width + height))),
      roughness,
      rng
    );
    allPoints.push(...topPoints.slice(0, -1)); // Exclude last point to avoid duplication
    
    // Right edge
    const rightPoints = this.generateRoughLine(
      { x: width, y: 0 },
      { x: width, y: height },
      Math.floor(segments * (height / (width + height))),
      roughness,
      rng
    );
    allPoints.push(...rightPoints.slice(0, -1));
    
    // Bottom edge
    const bottomPoints = this.generateRoughLine(
      { x: width, y: height },
      { x: 0, y: height },
      Math.floor(segments * (width / (width + height))),
      roughness,
      rng
    );
    allPoints.push(...bottomPoints.slice(0, -1));
    
    // Left edge
    const leftPoints = this.generateRoughLine(
      { x: 0, y: height },
      { x: 0, y: 0 },
      Math.floor(segments * (height / (width + height))),
      roughness,
      rng
    );
    allPoints.push(...leftPoints.slice(0, -1));
    
    return this.pointsToPath(allPoints) + ' Z';
  }

  /**
   * Generates a rounded rectangular border path with roughness
   */
  static generateRoundedRectPath(config: BorderPathConfig): string {
    const { width, height, borderRadius, roughness, seed = Math.random() } = config;
    const rng = new SeededRandom(seed);
    
    // Clamp border radius to reasonable bounds
    const maxRadius = Math.min(width, height) / 2;
    const radius = Math.min(borderRadius, maxRadius);
    
    const allPoints: Point[] = [];
    const arcSegments = Math.max(4, Math.floor(radius / 3));
    const lineSegments = Math.max(4, Math.floor((width + height) / 30));
    
    // Top-left corner arc
    const topLeftArc = this.generateRoughArc(
      { x: radius, y: radius },
      radius,
      Math.PI,
      Math.PI * 1.5,
      arcSegments,
      roughness,
      rng
    );
    allPoints.push(...topLeftArc.slice(0, -1));
    
    // Top edge
    const topPoints = this.generateRoughLine(
      { x: radius, y: 0 },
      { x: width - radius, y: 0 },
      lineSegments,
      roughness,
      rng
    );
    allPoints.push(...topPoints.slice(0, -1));
    
    // Top-right corner arc
    const topRightArc = this.generateRoughArc(
      { x: width - radius, y: radius },
      radius,
      Math.PI * 1.5,
      Math.PI * 2,
      arcSegments,
      roughness,
      rng
    );
    allPoints.push(...topRightArc.slice(0, -1));
    
    // Right edge
    const rightPoints = this.generateRoughLine(
      { x: width, y: radius },
      { x: width, y: height - radius },
      lineSegments,
      roughness,
      rng
    );
    allPoints.push(...rightPoints.slice(0, -1));
    
    // Bottom-right corner arc
    const bottomRightArc = this.generateRoughArc(
      { x: width - radius, y: height - radius },
      radius,
      0,
      Math.PI * 0.5,
      arcSegments,
      roughness,
      rng
    );
    allPoints.push(...bottomRightArc.slice(0, -1));
    
    // Bottom edge
    const bottomPoints = this.generateRoughLine(
      { x: width - radius, y: height },
      { x: radius, y: height },
      lineSegments,
      roughness,
      rng
    );
    allPoints.push(...bottomPoints.slice(0, -1));
    
    // Bottom-left corner arc
    const bottomLeftArc = this.generateRoughArc(
      { x: radius, y: height - radius },
      radius,
      Math.PI * 0.5,
      Math.PI,
      arcSegments,
      roughness,
      rng
    );
    allPoints.push(...bottomLeftArc.slice(0, -1));
    
    // Left edge
    const leftPoints = this.generateRoughLine(
      { x: 0, y: height - radius },
      { x: 0, y: radius },
      lineSegments,
      roughness,
      rng
    );
    allPoints.push(...leftPoints.slice(0, -1));
    
    return this.pointsToPath(allPoints) + ' Z';
  }

  /**
   * Generates a circular border path with roughness
   */
  static generateCirclePath(config: BorderPathConfig): string {
    const { width, height, roughness, seed = Math.random() } = config;
    const rng = new SeededRandom(seed);
    
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY);
    
    const segments = Math.max(16, Math.floor(radius / 2));
    
    const points = this.generateRoughArc(
      { x: centerX, y: centerY },
      radius,
      0,
      Math.PI * 2,
      segments,
      roughness,
      rng
    );
    
    return this.pointsToPath(points) + ' Z';
  }
}

/**
 * Predefined roughness levels for consistent styling
 */
export const RoughnessLevels = {
  subtle: 0.3,
  medium: 0.5,
  strong: 0.7,
} as const;

/**
 * Predefined border width levels
 */
export const BorderWidths = {
  thin: 2,
  medium: 3,
  thick: 4,
} as const;