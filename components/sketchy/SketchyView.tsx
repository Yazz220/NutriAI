import React from 'react';
import { View, ViewProps, ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { BorderPathGenerator, BorderPathConfig, RoughnessLevels, BorderWidths } from '@/utils/sketchyBorders';
import { Colors } from '@/constants/colors';

export interface SketchyViewProps extends ViewProps {
  variant?: 'card' | 'button' | 'input' | 'container';
  borderWidth?: keyof typeof BorderWidths | number;
  borderColor?: string;
  roughness?: keyof typeof RoughnessLevels | number;
  borderRadius?: number;
  shape?: 'rect' | 'roundedRect' | 'circle';
  children?: React.ReactNode;
  disabled?: boolean;
}

/**
 * A wrapper component that renders any View with hand-drawn borders using SVG overlays
 */
export const SketchyView: React.FC<SketchyViewProps> = ({
  variant = 'container',
  borderWidth = 'medium',
  borderColor = Colors.primary,
  roughness = 'medium',
  borderRadius = 12,
  shape = 'roundedRect',
  children,
  disabled = false,
  style,
  ...props
}) => {
  const [dimensions, setDimensions] = React.useState({ width: 0, height: 0 });
  const [svgPath, setSvgPath] = React.useState<string>('');

  // Convert string values to numbers
  const numericBorderWidth = typeof borderWidth === 'string' ? BorderWidths[borderWidth] : borderWidth;
  const numericRoughness = typeof roughness === 'string' ? RoughnessLevels[roughness] : roughness;

  // Generate SVG path when dimensions or config changes
  React.useEffect(() => {
    if (dimensions.width > 0 && dimensions.height > 0) {
      const config: BorderPathConfig = {
        width: dimensions.width,
        height: dimensions.height,
        borderRadius,
        roughness: numericRoughness,
        seed: 42, // Fixed seed for consistent appearance
      };

      let path: string;
      switch (shape) {
        case 'circle':
          path = BorderPathGenerator.generateCirclePath(config);
          break;
        case 'rect':
          path = BorderPathGenerator.generateRectPath(config);
          break;
        case 'roundedRect':
        default:
          path = BorderPathGenerator.generateRoundedRectPath(config);
          break;
      }

      setSvgPath(path);
    }
  }, [dimensions.width, dimensions.height, borderRadius, numericRoughness, shape]);

  const handleLayout = (event: any) => {
    const { width, height } = event.nativeEvent.layout;
    setDimensions({ width, height });
  };

  // Apply variant-specific styling
  const getVariantStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      position: 'relative',
    };

    switch (variant) {
      case 'card':
        return {
          ...baseStyle,
          backgroundColor: Colors.card,
          padding: 16,
        };
      case 'button':
        return {
          ...baseStyle,
          backgroundColor: Colors.primary,
          paddingHorizontal: 16,
          paddingVertical: 12,
          alignItems: 'center',
          justifyContent: 'center',
        };
      case 'input':
        return {
          ...baseStyle,
          backgroundColor: Colors.background,
          paddingHorizontal: 12,
          paddingVertical: 8,
          minHeight: 44,
        };
      case 'container':
      default:
        return baseStyle;
    }
  };

  const finalBorderColor = disabled 
    ? Colors.borderMuted 
    : borderColor;

  const containerStyle: ViewStyle = {
    ...getVariantStyle(),
    ...(Array.isArray(style) ? Object.assign({}, ...style) : style),
  };

  return (
    <View
      {...props}
      style={containerStyle}
      onLayout={handleLayout}
    >
      {children}
      
      {/* SVG Border Overlay */}
      {dimensions.width > 0 && dimensions.height > 0 && svgPath && (
        <Svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: dimensions.width,
            height: dimensions.height,
            pointerEvents: 'none',
          }}
          width={dimensions.width}
          height={dimensions.height}
          viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
        >
          <Path
            d={svgPath}
            stroke={finalBorderColor}
            strokeWidth={numericBorderWidth}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      )}
    </View>
  );
};