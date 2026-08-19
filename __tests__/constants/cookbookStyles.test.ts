import { COOKBOOK_BINDINGS } from '@/constants/cookbookBindings';
import { listCookbookCreationStyles } from '@/constants/cookbookStyles';

describe('cookbook creation styles', () => {
  it('offers the luxury binding collection followed by the signature cookbook', () => {
    const styles = listCookbookCreationStyles();

    expect(styles.map((style) => style.id)).toEqual([
      'sage-linen',
      'terracotta-cloth',
      'navy-leather',
      'charcoal-cloth',
      'alabaster-linen',
      'umber-leather',
      'handwritten',
    ]);
  });

  it('binds every luxury style to a physical binding archetype', () => {
    const styles = listCookbookCreationStyles();

    for (const style of styles) {
      if (style.id === 'handwritten') continue;
      expect(style.binding).toBeDefined();
      expect(COOKBOOK_BINDINGS[style.binding!]).toBeDefined();
    }
  });
});
