const MAX_IMAGE_NOTE_CHARACTERS = 2_000;

export function buildImageRecipeEvidencePrompt(notes?: string): string {
  const base = 'Extract the complete recipe from this image. Read all visible text, handwriting, and cooking details.';
  const normalizedNotes = notes?.trim().slice(0, MAX_IMAGE_NOTE_CHARACTERS);
  if (!normalizedNotes) return base;

  return [
    base,
    `The user included this additional recipe context: ${JSON.stringify(normalizedNotes)}`,
    'Combine that context with the visible image evidence. Do not invent details that appear in neither source.',
  ].join('\n\n');
}
