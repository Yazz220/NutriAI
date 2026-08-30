import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/colors';
import { getWallpaperStyle, type WallpaperStyleId } from '@/constants/shelfAppearance';

interface ShelfWallpaperProps {
  wallpaperStyleId: WallpaperStyleId;
}

export const ShelfWallpaper = React.memo(function ShelfWallpaper({
  wallpaperStyleId,
}: ShelfWallpaperProps) {
  const wallpaper = getWallpaperStyle(wallpaperStyleId);

  if (!wallpaper.asset) {
    return (
      <LinearGradient
        colors={[Colors.legacySurface.v63, Colors.legacySurface.v50, Colors.legacySurface.v48]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
    );
  }

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Image
        source={wallpaper.asset}
        resizeMode="cover"
        style={styles.image}
        accessible={false}
      />
      {wallpaper.veilColor ? (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: wallpaper.veilColor }]} />
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  image: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
});
