import React from 'react';
import { Image, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Radii, Spacing } from '@/constants/spacing';
import { Fonts } from '@/utils/fonts';
import type { CookbookPage, StructuredIngredient } from '@/types/cookbook';

interface PageCanvasProps {
  page: CookbookPage;
}

function formatIngredient(ingredient: StructuredIngredient) {
  return [ingredient.quantity, ingredient.unit, ingredient.name].filter(Boolean).join(' ');
}

function RecipeIllustration({ section }: { section: CookbookPage['section'] }) {
  const sectionColor =
    section === 'breakfast' ? '#D99C3A'
      : section === 'healthy' ? '#6E9346'
        : section === 'desserts' ? '#B8796E'
          : '#9D5F39';

  return (
    <View style={styles.illustration}>
      <View style={[styles.plate, { borderColor: sectionColor }]}>
        <View style={[styles.foodShapeLarge, { backgroundColor: sectionColor }]} />
        <View style={styles.foodShapeSmall} />
        <View style={styles.foodShapeDot} />
      </View>
      <View style={styles.illustrationCaption}>
        <Text style={styles.captionText}>Generated page preview</Text>
      </View>
    </View>
  );
}

function StructuredRecipePage({ page }: PageCanvasProps) {
  const recipe = page.recipe;
  const ingredients = recipe?.ingredients.slice(0, 7) ?? [];
  const steps = recipe?.steps.slice(0, 5) ?? [];
  const totalTime = (recipe?.prepTime ?? 0) + (recipe?.cookTime ?? 0);

  return (
    <View style={styles.paper}>
      <View style={styles.paperInner}>
        <View style={styles.sampleStamp}>
          <Text style={styles.sampleStampText}>{page.isSample ? 'Sample' : page.section}</Text>
        </View>

        <Text style={styles.kicker}>{page.section.toUpperCase()} COLLECTION</Text>
        <Text style={styles.title} numberOfLines={2} adjustsFontSizeToFit>
          {page.title}
        </Text>
        {recipe?.description ? (
          <Text style={styles.description} numberOfLines={2}>
            {recipe.description}
          </Text>
        ) : null}

        <View style={styles.metaRow}>
          <View style={styles.metaBox}>
            <Text style={styles.metaValue}>{recipe?.servings ?? '-'}</Text>
            <Text style={styles.metaLabel}>Serves</Text>
          </View>
          <View style={styles.metaBox}>
            <Text style={styles.metaValue}>{totalTime || '-'}</Text>
            <Text style={styles.metaLabel}>Minutes</Text>
          </View>
          <View style={styles.metaBox}>
            <Text style={styles.metaValue}>{ingredients.length}</Text>
            <Text style={styles.metaLabel}>Items</Text>
          </View>
        </View>

        <RecipeIllustration section={page.section} />

        <View style={styles.rule} />

        <View style={styles.columns}>
          <View style={styles.column}>
            <Text style={styles.sectionTitle}>Ingredients</Text>
            {ingredients.map((ingredient, index) => (
              <Text key={`${ingredient.name}-${index}`} style={styles.listText} numberOfLines={2}>
                {formatIngredient(ingredient)}
              </Text>
            ))}
          </View>
          <View style={styles.column}>
            <Text style={styles.sectionTitle}>Directions</Text>
            {steps.map((step, index) => (
              <Text key={`${step}-${index}`} style={styles.stepText} numberOfLines={3}>
                {index + 1}. {step}
              </Text>
            ))}
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Nosh cookbook</Text>
          <Text style={styles.footerText}>{page.pageNumber}</Text>
        </View>
      </View>
    </View>
  );
}

export function PageCanvas({ page }: PageCanvasProps) {
  const { width, height } = useWindowDimensions();
  const horizontalInset = width < 390 ? Spacing.md : Spacing.xl;
  const pageWidth = Math.min(width - horizontalInset * 2, 430);
  const maxHeight = Math.max(500, height - 220);

  return (
    <View style={[styles.frame, { width: pageWidth, maxHeight }]}>
      {page.imageUrl ? (
        <Image source={{ uri: page.imageUrl }} style={styles.image} resizeMode="contain" />
      ) : (
        <StructuredRecipePage page={page} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    aspectRatio: 0.72,
    borderRadius: Radii.lg,
    backgroundColor: '#F5E5C6',
    borderWidth: 1,
    borderColor: '#C7A97C',
    overflow: 'hidden',
    boxShadow: '0 18px 36px rgba(54, 36, 18, 0.18)',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  paper: {
    flex: 1,
    backgroundColor: '#FFF7E8',
    padding: 10,
  },
  paperInner: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D8BE8E',
    padding: 14,
    backgroundColor: '#FFF9EF',
    gap: 8,
  },
  sampleStamp: {
    position: 'absolute',
    right: 12,
    top: 12,
    zIndex: 2,
    borderWidth: 1,
    borderColor: '#B8796E',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    transform: [{ rotate: '5deg' }],
    backgroundColor: 'rgba(255, 249, 239, 0.9)',
  },
  sampleStampText: {
    color: '#9A5148',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  kicker: {
    color: '#7F6A46',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0,
  },
  title: {
    color: '#3E2C1B',
    fontFamily: Fonts.display.bold,
    fontSize: 28,
    lineHeight: 32,
    paddingRight: 68,
  },
  description: {
    color: '#6D5738',
    fontSize: 12,
    lineHeight: 17,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
  },
  metaBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0CDAA',
    backgroundColor: '#F8E9CC',
    paddingVertical: 7,
    alignItems: 'center',
  },
  metaValue: {
    color: '#3E2C1B',
    fontSize: 15,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  metaLabel: {
    color: '#806A46',
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  illustration: {
    minHeight: 108,
    borderWidth: 1,
    borderColor: '#E0CDAA',
    backgroundColor: '#F4E1BE',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  plate: {
    width: 88,
    height: 58,
    borderRadius: 44,
    borderWidth: 2,
    backgroundColor: '#FFF8E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  foodShapeLarge: {
    width: 38,
    height: 24,
    borderRadius: 18,
    opacity: 0.85,
    transform: [{ rotate: '-8deg' }],
  },
  foodShapeSmall: {
    position: 'absolute',
    right: 20,
    top: 16,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#E6B75C',
  },
  foodShapeDot: {
    position: 'absolute',
    left: 22,
    bottom: 15,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#6E9346',
  },
  illustrationCaption: {
    position: 'absolute',
    bottom: 7,
    right: 10,
  },
  captionText: {
    color: '#806A46',
    fontSize: 9,
    fontStyle: 'italic',
  },
  rule: {
    height: 1,
    backgroundColor: '#D8BE8E',
  },
  columns: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 0,
  },
  column: {
    flex: 1,
    gap: 5,
  },
  sectionTitle: {
    color: '#3E2C1B',
    fontFamily: Fonts.display.semibold,
    fontSize: 17,
  },
  listText: {
    color: '#584125',
    fontSize: 10.5,
    lineHeight: 14,
  },
  stepText: {
    color: '#584125',
    fontSize: 10.5,
    lineHeight: 14,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#E0CDAA',
    paddingTop: 6,
  },
  footerText: {
    color: '#9B835A',
    fontSize: 10,
    fontWeight: '700',
  },
});
