import type { NoshInteractionSession } from '@/types/noshInteraction';

export interface NoshStartConfig {
  title: string;
  copy: string;
  prompts: string[];
}

export function getNoshStartConfig(
  interaction: NoshInteractionSession,
  contextModelEnabled: boolean,
): NoshStartConfig {
  if (!contextModelEnabled) {
    const hasRecipe = interaction.focus.kind === 'recipe';
    return {
      title: 'What are we cooking?',
      copy: 'Share a link, recipe photo, video, or simply tell Nosh what you feel like eating.',
      prompts: hasRecipe
        ? ['Scale this recipe', 'What can I substitute?', 'Walk me through cooking', 'Start a timer']
        : ['Add a recipe from a link', 'Read a recipe photo', 'Help me choose dinner'],
    };
  }
  if (interaction.task === 'capture') {
    return {
      title: 'Bring in a recipe',
      copy: 'Send the source. Nosh will prepare the full page and add it to the right cookbook automatically.',
      prompts: ['Add a recipe link', 'Read a recipe photo', 'Paste recipe text'],
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
    title: 'What can Nosh help with?',
    copy: 'Find something you saved, plan from your cookbooks, or tidy up your collection.',
    prompts: ['Find a recipe I saved', 'Help me choose what to cook', 'Save or check a recipe', 'Organize my cookbooks', 'Create a new cookbook'],
  };
}

export function getNoshComposerMode(
  interaction: NoshInteractionSession,
  contextModelEnabled: boolean,
) {
  if (!contextModelEnabled) {
    return { allowsRecipePhoto: true, placeholder: 'Drop a recipe link or ask Nosh...' };
  }
  if (interaction.task === 'capture') {
    return { allowsRecipePhoto: true, placeholder: 'Send a recipe link, text, or photo...' };
  }
  if (interaction.focus.kind === 'recipe') {
    return { allowsRecipePhoto: false, placeholder: `Ask about ${interaction.focus.title}...` };
  }
  return { allowsRecipePhoto: false, placeholder: 'Ask Nosh about your cookbooks...' };
}
