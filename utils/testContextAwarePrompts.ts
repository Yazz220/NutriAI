// Test utility to verify context-aware prompts are working
// Run this in your app to test the new system

import { debugIngredientPrompt, simulateAPICall, comparePromptStyles } from './debugIngredientPrompts';
import { fetchIngredientIcon } from './iconApi';

/**
 * Test the context-aware prompt system
 * Call this function in your app to verify everything is working
 */
export async function testContextAwarePrompts() {
  console.log('🧪 Testing Context-Aware Ingredient Prompts');
  console.log('============================================');
  
  // Test 1: Verify prompt generation
  console.log('\n1. Testing prompt generation...');
  const testIngredients = ['flour', 'milk', 'apple', 'chicken breast'];
  
  testIngredients.forEach(ingredient => {
    const result = debugIngredientPrompt(ingredient);
    console.log(`✅ ${ingredient}: ${result.subject.subject}`);
  });
  
  // Test 2: Simulate API calls
  console.log('\n2. Testing API payload format...');
  testIngredients.forEach(ingredient => {
    const payload = simulateAPICall(ingredient);
    console.log(`✅ ${ingredient} payload ready`);
  });
  
  // Test 3: Compare old vs new
  console.log('\n3. Comparing old vs new styles...');
  testIngredients.forEach(ingredient => {
    comparePromptStyles(ingredient);
  });
  
  console.log('\n✅ All tests completed! Check console for details.');
}

/**
 * Test actual API call (use carefully - this will make real requests)
 */
export async function testRealAPICall(ingredientName: string) {
  console.log(`🌐 Testing real API call for: ${ingredientName}`);
  
  try {
    const slug = ingredientName.toLowerCase().replace(/\s+/g, '-');
    const response = await fetchIngredientIcon(slug, ingredientName);
    
    console.log('✅ API call successful:', {
      status: response.status,
      hasImage: !!response.image_url,
      slug: response.slug
    });
    
    return response;
  } catch (error) {
    console.error('❌ API call failed:', error);
    throw error;
  }
}

/**
 * Quick test function - call this from your app
 */
export function quickTest() {
  console.log('🚀 Quick Context-Aware Prompt Test');
  console.log('===================================');
  
  // Test a few ingredients
  const ingredients = ['flour', 'milk', 'apple'];
  
  ingredients.forEach(ingredient => {
    const result = debugIngredientPrompt(ingredient);
    console.log(`\n${ingredient.toUpperCase()}:`);
    console.log(`Category: ${result.category}`);
    console.log(`Subject: ${result.subject.subject}`);
    console.log(`Prompt: ${result.prompt.positive.substring(0, 100)}...`);
  });
}