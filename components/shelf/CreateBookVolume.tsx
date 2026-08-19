import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Plus } from 'lucide-react-native';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Fonts } from '@/utils/fonts';
import { PHYSICAL_BOOK_ASPECT } from '@/components/physical-book/PhysicalBook';

/**
 * The "+ Create New Cookbook" placeholder standing at the end of the shelf:
 * unbound boards (dashed outline) with a plus emblem, posed by the same
 * carousel math as the bound volumes around it.
 */

interface CreateBookVolumeProps {
  width: number;
}

export const CreateBookVolume = React.memo(function CreateBookVolume({ width }: CreateBookVolumeProps) {
  const height = width * PHYSICAL_BOOK_ASPECT;
  const plusSize = Math.round(width * 0.16);
  const titleSize = Math.max(12, Math.round(width * 0.075));

  return (
    <View style={[styles.boards, { width, height }]}>
      <Plus size={plusSize} color={Colors.duskGrey} strokeWidth={1.6} />
      <Text style={[styles.title, { fontSize: titleSize, lineHeight: titleSize * 1.25 }]}>New Cookbook</Text>
    </View>
  );
});

/** The create volume's spine-out pose on the packed shelf: unbound boards
 * edge with a plus mark, no title. */
export const CreateBookSpine = React.memo(function CreateBookSpine({
  width,
  height,
}: {
  width: number;
  height: number;
}) {
  return (
    <View style={[styles.spineBoards, { width, height }]}>
      <Plus size={Math.max(12, Math.round(width * 0.6))} color={Colors.duskGrey} strokeWidth={1.6} />
    </View>
  );
});

const styles = StyleSheet.create({
  boards: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.duskGrey,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  spineBoards: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.duskGrey,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: Fonts.display.semibold,
    color: Colors.slate,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
});
