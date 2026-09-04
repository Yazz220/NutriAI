import {
  getNoshComposerMode,
  getNoshStartConfig,
} from '@/components/nosh/conversation/noshConversationPresentation';
import type { NoshInteractionSession } from '@/types/noshInteraction';

const collection: NoshInteractionSession = {
  entryPoint: 'shelf-nosh',
  task: 'collection',
  focus: { kind: 'collection' },
};

const recipe: NoshInteractionSession = {
  entryPoint: 'recipe-ask',
  task: 'recipe-help',
  focus: { kind: 'recipe', cookbookId: 'book-1', pageId: 'page-1', title: 'Baked Cheesecake' },
};

const capture: NoshInteractionSession = {
  entryPoint: 'cookbook-add',
  task: 'capture',
  focus: { kind: 'cookbook', cookbookId: 'book-1', title: 'Dinner' },
};

const preferences: NoshInteractionSession = {
  entryPoint: 'settings-preferences',
  task: 'preferences',
  focus: { kind: 'collection' },
};

const cookbook: NoshInteractionSession = {
  entryPoint: 'cookbook-nosh',
  task: 'cookbook-help',
  focus: { kind: 'cookbook', cookbookId: 'book-1', title: 'Dinner' },
};

describe('purpose-built Folio conversation wrappers', () => {
  it('gives an empty shelf conversation collection jobs instead of capture prompts', () => {
    const config = getNoshStartConfig(collection);

    expect(config.title).toBe('What can Folio help with?');
    expect(config.prompts).toEqual(expect.arrayContaining([
      'Find a recipe I saved',
      'Save or check a recipe',
      'Organize my cookbooks',
      'Create a new cookbook',
    ]));
    expect(config.prompts).not.toContain('Add a recipe from a link');
  });

  it('names the focused recipe and offers recipe-specific starts', () => {
    const config = getNoshStartConfig(recipe);

    expect(config.title).toBe('Baked Cheesecake');
    expect(config.prompts).toContain('Make this for two');
  });

  it('removes capture attachments and mixed copy from general conversation', () => {
    expect(getNoshComposerMode(collection)).toEqual({
      allowsRecipePhoto: false,
      placeholder: 'Ask Folio about your cookbooks…',
    });
    expect(getNoshComposerMode(recipe)).toEqual({
      allowsRecipePhoto: false,
      placeholder: 'Ask about Baked Cheesecake…',
    });
  });

  it('keeps source controls in the dedicated capture task', () => {
    expect(getNoshStartConfig(capture).copy).toContain('add it to the right cookbook automatically');
    expect(getNoshStartConfig(capture).copy).not.toContain('ask before');
    expect(getNoshComposerMode(capture)).toEqual({
      allowsRecipePhoto: true,
      placeholder: 'Send a recipe link, text, or photo…',
    });
  });

  it('keeps one contextual recipe presentation without a split feature flag', () => {
    expect(getNoshStartConfig(recipe).title).toBe('Baked Cheesecake');
    expect(getNoshComposerMode(recipe)).toEqual({
      allowsRecipePhoto: false,
      placeholder: 'Ask about Baked Cheesecake…',
    });
  });

  it('gives the Settings entry point a focused preference conversation', () => {
    const config = getNoshStartConfig(preferences);

    expect(config.title).toBe('What should Folio remember?');
    expect(config.copy).toContain('every cookbook');
    expect(config.prompts).toEqual(expect.arrayContaining([
      'Use metric measurements',
      'I have a food allergy',
    ]));
    expect(getNoshComposerMode(preferences).placeholder).toBe(
      'Tell Folio how you like to cook…',
    );
  });

  it('gives an open cookbook its own contextual wrapper', () => {
    const config = getNoshStartConfig(cookbook);

    expect(config.title).toBe('Dinner');
    expect(config.prompts).toContain('What can I cook from this book?');
    expect(getNoshComposerMode(cookbook).placeholder).toBe('Ask about Dinner…');
  });
});
