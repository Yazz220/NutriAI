import type { NoshInteractionSession } from '@/types/noshInteraction';

export interface NoshStartConfig {
  title: string;
  copy: string;
  prompts: string[];
}

export function getNoshStartConfig(
  interaction: NoshInteractionSession,
): NoshStartConfig {
  if (interaction.task === 'capture') {
    return {
      title: 'Bring in a recipe',
      copy: 'Send the source. Folio will prepare the full page and add it to the right cookbook automatically.',
      prompts: ['Add a recipe link', 'Read a recipe photo', 'Paste recipe text'],
    };
  }
  if (interaction.task === 'preferences') {
    return {
      title: 'What should Folio remember?',
      copy: 'Saved preferences shape Folio\'s help in every cookbook. You will confirm each one before it is saved.',
      prompts: [
        'Use metric measurements',
        'I have a food allergy',
        'I usually cook for two',
        'Remember an ingredient I avoid',
      ],
    };
  }
  if (interaction.task === 'cookbook-help' && interaction.focus.kind === 'cookbook') {
    return {
      title: interaction.focus.title,
      copy: 'Ask about the recipes in this cookbook, find a page, or decide what to cook.',
      prompts: [
        'What can I cook from this book?',
        'Find a quick recipe in this book',
        'Which recipes fit my preferences?',
        'Help me choose a page',
      ],
    };
  }
  if (interaction.focus.kind === 'recipe') {
    return {
      title: interaction.focus.title,
      copy: 'Ask naturally about this recipe, adapt it, or cook through it together.',
      prompts: ['Make this for two', 'What can I substitute?', 'Give me the shopping list', 'What should I do first?'],
    };
  }
  return {
    title: 'What can Folio help with?',
    copy: 'Find something you saved, plan from your cookbooks, or tidy up your collection.',
    prompts: ['Find a recipe I saved', 'Help me choose what to cook', 'Save or check a recipe', 'Organize my cookbooks', 'Create a new cookbook'],
  };
}

export function getNoshComposerMode(
  interaction: NoshInteractionSession,
) {
  if (interaction.task === 'capture') {
    return { allowsRecipePhoto: true, placeholder: 'Send a recipe link, text, or photo…' };
  }
  if (interaction.task === 'preferences') {
    return { allowsRecipePhoto: false, placeholder: 'Tell Folio how you like to cook…' };
  }
  if (interaction.task === 'cookbook-help' && interaction.focus.kind === 'cookbook') {
    return { allowsRecipePhoto: false, placeholder: `Ask about ${interaction.focus.title}…` };
  }
  if (interaction.focus.kind === 'recipe') {
    return { allowsRecipePhoto: false, placeholder: `Ask about ${interaction.focus.title}…` };
  }
  return { allowsRecipePhoto: false, placeholder: 'Ask Folio about your cookbooks…' };
}

export function getNoshContextNote(interaction: NoshInteractionSession): string | null {
  if (interaction.focus.kind === 'recipe') return `Recipe: ${interaction.focus.title}`;
  if (interaction.task === 'cookbook-help' && interaction.focus.kind === 'cookbook') {
    return `Cookbook: ${interaction.focus.title}`;
  }
  if (interaction.task === 'preferences') return 'Preferences apply across every cookbook';
  return null;
}
