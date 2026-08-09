import React from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { BookCover } from '@/components/cookbook/BookCover';
import { CookbookLeafPage } from '@/components/cookbook/CookbookLeafPage';
import { OpenBookSpread } from '@/components/cookbook/OpenBookSpread';
import type { Cookbook3DSceneProps } from '@/components/cookbook/Cookbook3DScene.types';

export function Cookbook3DScene({
  cookbook,
  pages,
  spreads,
  spreadIndex,
  isOpen,
  onOpen,
  onNext,
  onPrevious,
  onOpenRecipe,
  style,
}: Cookbook3DSceneProps) {
  const { width, height } = useWindowDimensions();
  const leafWidth = Math.max(120, Math.min(340, (width - 32) / 2, (height - 230) / 1.38));
  const bookHeight = leafWidth * 1.38;
  const activeSpread = spreads[spreadIndex] ?? spreads[0];

  return (
    <View style={[styles.container, style]}>
      {isOpen ? (
        <OpenBookSpread
          width={leafWidth * 2}
          height={bookHeight}
          left={
            <CookbookLeafPage
              leaf={activeSpread.left}
              cookbook={cookbook}
              pages={pages}
              onSelectRecipe={onPrevious}
              onOpenRecipe={onOpenRecipe}
            />
          }
          right={
            <CookbookLeafPage
              leaf={activeSpread.right}
              cookbook={cookbook}
              pages={pages}
              onSelectRecipe={onNext}
              onOpenRecipe={onOpenRecipe}
            />
          }
        />
      ) : (
        <Pressable onPress={onOpen} accessibilityLabel={`Open ${cookbook?.title ?? 'cookbook'}`}>
          <BookCover
            title={cookbook?.title ?? 'My Cookbook'}
            coverStyle={cookbook?.coverStyle ?? 'handwritten'}
            pageCount={pages.length}
            imageAsset={cookbook?.coverImageAsset}
            width={leafWidth}
            showPageCount={false}
          />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
