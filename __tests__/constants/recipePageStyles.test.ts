import {
  ACTIVE_RECIPE_PAGE_STYLE_IDS,
  ACTIVE_RECIPE_PAGE_STYLE_REVISIONS,
  compileRecipePageStyleDescriptor,
  listActiveRecipePageStyles,
  resolveRecipePageStyleVersion,
} from '@/constants/recipePageStyles';

describe('versioned recipe page style registry', () => {
  it('resolves every Studio option to one immutable active version', () => {
    const active = listActiveRecipePageStyles();

    expect(active.map((style) => style.id)).toEqual(ACTIVE_RECIPE_PAGE_STYLE_IDS);
    active.forEach((style) => {
      expect(style.status).toBe('active');
      expect(style.revision).toBe(ACTIVE_RECIPE_PAGE_STYLE_REVISIONS[style.id]);
      expect(resolveRecipePageStyleVersion(style.id, style.revision)).toBe(style);
    });
  });

  it('preserves previous style definitions as legacy versions', () => {
    expect(resolveRecipePageStyleVersion('illustrated', 1)?.status).toBe('legacy');
    expect(resolveRecipePageStyleVersion('illustrated', 2)?.status).toBe('active');
    expect(resolveRecipePageStyleVersion('heritage', 1)?.status).toBe('legacy');
    expect(resolveRecipePageStyleVersion('heritage', 2)?.status).toBe('active');
    expect(resolveRecipePageStyleVersion('studio-editorial', 1)?.status).toBe('legacy');
    expect(resolveRecipePageStyleVersion('studio-editorial', 2)).toBeUndefined();
    expect(resolveRecipePageStyleVersion('bold', 1)?.status).toBe('legacy');
    expect(resolveRecipePageStyleVersion('bold', 2)).toBeUndefined();
  });

  it('gives every active style a distinguishable thumbnail-scale contract', () => {
    const descriptors = listActiveRecipePageStyles().map((style) => (
      compileRecipePageStyleDescriptor(style, 'standard')
    ));

    expect(new Set(descriptors).size).toBe(ACTIVE_RECIPE_PAGE_STYLE_IDS.length);
    expect(descriptors.join('\n')).toContain('absolutely no photography');
    expect(descriptors.join('\n')).toContain('warm humanist serif');
    expect(descriptors.join('\n')).toContain('formal symmetry');
    expect(descriptors.join('\n')).toContain('notebook grid');
  });
});
