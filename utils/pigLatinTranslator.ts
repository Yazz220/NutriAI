/**
 * Pig Latin Translator
 *
 * Translates English text to Pig Latin following these rules:
 * 1. If word begins with consonant(s), move them to end and add "ay"
 * 2. If word begins with vowel, add "way" to end
 * 3. 'y' is treated as consonant at start, vowel elsewhere
 * 4. Preserve capitalization of first letter
 * 5. Handle punctuation and numbers appropriately
 */

export interface PigLatinTranslation {
  original: string;
  translated: string;
  wordCount: number;
}

const VOWELS = new Set(['a', 'e', 'i', 'o', 'u', 'A', 'E', 'I', 'O', 'U']);

/**
 * Translates a single word to Pig Latin
 */
export function translateWord(word: string): string {
  // Handle empty strings and whitespace
  if (!word.trim()) return word;

  // Find the first and last letter positions to extract word part
  const firstLetterIndex = word.search(/[a-zA-Z]/);
  if (firstLetterIndex === -1) return word; // No letters found, return as-is

  const lastLetterIndex = word.search(/[a-zA-Z][^a-zA-Z]*$/);
  const prefix = word.substring(0, firstLetterIndex);
  const wordPart = word.substring(firstLetterIndex, lastLetterIndex + 1);
  const suffix = word.substring(lastLetterIndex + 1);

  const translatedWord = translateWordPart(wordPart);

  return prefix + translatedWord + suffix;
}

/**
 * Translates the alphabetic part of a word to Pig Latin
 */
function translateWordPart(word: string): string {
  // Handle empty strings
  if (!word) return word;

  // Preserve original capitalization
  const isCapitalized = word[0] === word[0].toUpperCase();
  const lowerWord = word.toLowerCase();

  // Find first vowel position
  let firstVowelIndex = -1;
  for (let i = 0; i < lowerWord.length; i++) {
    const char = lowerWord[i];
    if (VOWELS.has(char)) {
      // Special case for 'qu' - treat as single consonant cluster
      if (char === 'u' && i > 0 && lowerWord[i - 1] === 'q') {
        continue; // Skip 'u' in 'qu' - treat 'qu' as single unit
      }
      // 'y' at the start should be treated as a consonant
      if (char === 'y' && i === 0) {
        continue; // Treat 'y' at start as consonant
      }
      firstVowelIndex = i;
      break;
    }
    // 'y' after start acts as vowel if no other vowels found
    if (char === 'y' && i > 0 && firstVowelIndex === -1) {
      firstVowelIndex = i;
      break;
    }
  }

  let translated: string;

  if (firstVowelIndex === -1) {
    // No vowels found - treat as consonant word
    translated = lowerWord + 'ay';
  } else if (firstVowelIndex === 0) {
    // Starts with vowel
    translated = lowerWord + 'way';
  } else {
    // Starts with consonant(s)
    const consonantPart = lowerWord.substring(0, firstVowelIndex);
    const restPart = lowerWord.substring(firstVowelIndex);
    translated = restPart + consonantPart + 'ay';
  }

  // Restore capitalization if original was capitalized
  if (isCapitalized) {
    return translated.charAt(0).toUpperCase() + translated.slice(1);
  }

  return translated;
}

/**
 * Translates a full text string to Pig Latin
 */
export function translateToPigLatin(text: string): PigLatinTranslation {
  if (!text.trim()) {
    return {
      original: text,
      translated: text,
      wordCount: 0
    };
  }

  // Split text into words, preserving whitespace and punctuation
  const words = text.split(/(\s+|[^\w\s]+)/);

  const translatedWords = words.map(word => {
    // Only translate actual words, not whitespace or punctuation
    if (/^\w+$/.test(word)) {
      return translateWord(word);
    }
    return word;
  });

  const translated = translatedWords.join('');

  return {
    original: text,
    translated,
    wordCount: words.filter(word => /^\w+$/.test(word)).length
  };
}

/**
 * Translates Pig Latin text back to English (basic implementation)
 */
export function translateFromPigLatin(text: string): PigLatinTranslation {
  if (!text.trim()) {
    return {
      original: text,
      translated: text,
      wordCount: 0
    };
  }

  // Split text into words, preserving whitespace and punctuation
  const words = text.split(/(\s+|[^\w\s]+)/);

  const translatedWords = words.map(word => {
    // Only translate actual words, not whitespace or punctuation
    if (/^\w+$/.test(word)) {
      return translateWordFromPigLatin(word);
    }
    return word;
  });

  const translated = translatedWords.join('');

  return {
    original: text,
    translated,
    wordCount: words.filter(word => /^\w+$/.test(word)).length
  };
}

/**
 * Translates a single Pig Latin word back to English
 */
function translateWordFromPigLatin(word: string): string {
  if (!word) return word;

  // Preserve original capitalization
  const isCapitalized = word[0] === word[0].toUpperCase();
  const lowerWord = word.toLowerCase();

  let translated: string;

  if (lowerWord.endsWith('way')) {
    // Remove 'way' - started with vowel
    translated = lowerWord.slice(0, -3);
  } else if (lowerWord.endsWith('ay')) {
    // Remove 'ay' and move consonants back to front
    const withoutAy = lowerWord.slice(0, -2);

    // Find the last consonant cluster (everything except the last part)
    // This is a simplified approach - more complex cases might need better logic
    const lastVowelIndex = findLastVowelIndex(withoutAy);

    if (lastVowelIndex === -1) {
      // No vowels found, return as-is
      translated = withoutAy;
    } else {
      const restPart = withoutAy.substring(0, lastVowelIndex + 1);
      const consonantPart = withoutAy.substring(lastVowelIndex + 1);
      translated = consonantPart + restPart;
    }
  } else {
    // Not in Pig Latin format, return as-is
    translated = lowerWord;
  }

  // Restore capitalization if original was capitalized
  if (isCapitalized) {
    return translated.charAt(0).toUpperCase() + translated.slice(1);
  }

  return translated;
}

/**
 * Find the last vowel in a word (for reverse translation)
 */
function findLastVowelIndex(word: string): number {
  for (let i = word.length - 1; i >= 0; i--) {
    if (VOWELS.has(word[i])) {
      return i;
    }
  }
  return -1;
}