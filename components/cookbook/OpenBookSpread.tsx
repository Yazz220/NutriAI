import React from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Colors } from '@/constants/colors';

interface OpenBookSpreadProps {
  children: React.ReactNode;
}

export function OpenBookSpread({ children }: OpenBookSpreadProps) {
  const { width, height } = useWindowDimensions();
  const pageWidth = Math.min(width - 42, 560);
  const pageHeight = Math.min(Math.max(540, height - 156), pageWidth * 1.45);

  return (
    <View style={styles.wrap}>
      <View style={[styles.page, { width: pageWidth, height: pageHeight }]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  page: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: Colors.book.page,
    borderWidth: 1,
    borderColor: Colors.book.edge,
    boxShadow: Colors.book.paperShadow,
  },
});
