import React, { useEffect, useMemo, useState } from 'react';
import { Image, ImageStyle, StyleProp, View, Platform } from 'react-native';
import LoadingSvg from '../assets/images/loading-buffer.svg';
import { slugifyIngredient } from '@/utils/ingredientSlug';
import { fetchIngredientIcon } from '@/utils/iconApi';

// Client renders a gray box as placeholder while server generates the icon

export type IngredientIconProps = {
  name: string;
  variant?: string;
  size?: number;
  style?: StyleProp<ImageStyle>;
  displayNameOverride?: string;
};

export const IngredientIcon: React.FC<IngredientIconProps> = ({ name, variant, size = 28, style, displayNameOverride }) => {
  const slug = useMemo(() => slugifyIngredient(name, variant), [name, variant]);
  const [uri, setUri] = useState<string | null>(null);
  const [status, setStatus] = useState<'ready' | 'pending' | 'failed' | 'idle'>('idle');

  useEffect(() => {
    let canceled = false;

    async function run() {
      try {
        setStatus('pending');
        const json = await fetchIngredientIcon(slug, displayNameOverride || name);
        if (canceled) return;
        
        if (json.status === 'ready' && json.image_url) {
          setUri(json.image_url);
          setStatus('ready');
        } else {
          setUri(json.image_url || null);
          setStatus(json.status || 'pending');
          // Poll for completion if pending
          if (json.status === 'pending') {
            pollReady(5_000);
          }
        }
      } catch (e) {
        console.warn('IngredientIcon: Failed to fetch icon for', name, e);
        if (!canceled) setStatus('failed');
      }
    }

    async function pollReady(timeoutMs: number) {
      const start = Date.now();
      const pollInterval = 2000; // Poll every 2 seconds
      
      while (Date.now() - start < timeoutMs) {
        await new Promise((r) => setTimeout(r, pollInterval));
        if (canceled) return;
        
        try {
          const json = await fetchIngredientIcon(slug, displayNameOverride || name);
          if (json.status === 'ready' && json.image_url) {
            setUri(json.image_url);
            setStatus('ready');
            return;
          }
        } catch (e) {
          console.warn('IngredientIcon: Polling failed for', name, e);
          // Continue polling despite errors
        }
      }
      
      // Timeout reached
      if (!canceled) {
        console.warn('IngredientIcon: Timeout waiting for', name);
        setStatus('failed');
      }
    }

    run();
    return () => {
      canceled = true;
    };
  }, [slug, name, displayNameOverride]);

  if (status !== 'ready' && !uri) {
    // On web, importing SVG via Metro transformer may not apply; show a neutral box.
    if (Platform.OS === 'web') {
      return <View style={{ width: size, height: size, backgroundColor: '#eee', borderRadius: 6 }} />
    }
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <LoadingSvg width={size} height={size} />
      </View>
    );
  }

  return (
    <Image source={{ uri: uri! }} style={[{ width: size, height: size, resizeMode: 'contain' }, style]} />
  );
};

export default IngredientIcon;
