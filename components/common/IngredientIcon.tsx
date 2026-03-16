import React from 'react';
import { Image, View } from 'react-native';
import type { SvgProps } from 'react-native-svg';
import LoadingSvg from '../../assets/images/loading-buffer.svg';
import { fetchIngredientIcon } from '../../utils/iconApi';

export type IngredientIconProps = {
  slug: string;
  displayName?: string;
  size?: number;
  placeholderProps?: SvgProps;
};

export function IngredientIcon({ slug, displayName, size = 32, placeholderProps }: IngredientIconProps) {
  const [url, setUrl] = React.useState<string | null>(null);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const r = await fetchIngredientIcon(slug, displayName);
        if (!alive) return;
        if (r.status === 'ready' && r.image_url) {
          setUrl(r.image_url);
          setReady(true);
        }
      } catch {
        // Icon generation not available — silently stay on placeholder
      }
    })();

    return () => { alive = false; };
  }, [slug, displayName]);

  if (ready && url) {
    return (
      <View style={{ width: size, height: size, borderRadius: 12, overflow: 'hidden' }}>
        <Image
          source={{ uri: url }}
          style={{ width: size, height: size }}
          resizeMode="contain"
          onError={() => {
            setReady(false);
            setUrl(null);
          }}
        />
      </View>
    );
  }

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', borderRadius: 12, overflow: 'hidden' }}>
      <LoadingSvg width={size} height={size} {...placeholderProps} style={{ borderRadius: 12 }} />
    </View>
  );
}

export default IngredientIcon;
