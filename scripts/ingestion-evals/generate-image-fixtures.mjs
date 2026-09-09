import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDirectory, '..', '..');
const outputDirectory = resolve(
  projectRoot,
  'supabase/functions/extract-recipe/evals/fixtures/images',
);

await mkdir(outputDirectory, { recursive: true });

const cleanRecipeSvg = `
<svg width="1200" height="1500" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="1500" fill="#f8f3e9"/>
  <rect x="72" y="72" width="1056" height="1356" rx="28" fill="#fffdf8" stroke="#6f6558" stroke-width="3"/>
  <text x="120" y="160" font-family="Georgia, serif" font-size="64" fill="#1f1d1a">Orange Scones</text>
  <text x="120" y="220" font-family="Arial, sans-serif" font-size="30" fill="#5a5148">Makes 8 scones</text>
  <text x="120" y="300" font-family="Arial, sans-serif" font-size="38" font-weight="700" fill="#1f1d1a">Ingredients</text>
  <g font-family="Arial, sans-serif" font-size="30" fill="#27231f">
    <text x="135" y="360">250 g plain flour</text>
    <text x="135" y="410">60 g cold butter, cubed</text>
    <text x="135" y="460">40 g sugar</text>
    <text x="135" y="510">2 tsp baking powder</text>
    <text x="135" y="560">1 orange, zest and juice</text>
    <text x="135" y="610">120 ml milk</text>
  </g>
  <text x="120" y="700" font-family="Arial, sans-serif" font-size="38" font-weight="700" fill="#1f1d1a">Method</text>
  <g font-family="Arial, sans-serif" font-size="29" fill="#27231f">
    <text x="135" y="760">1. Heat the oven to 200°C.</text>
    <text x="135" y="820">2. Rub the butter into the flour.</text>
    <text x="135" y="880">3. Stir in sugar, baking powder, and orange zest.</text>
    <text x="135" y="940">4. Add orange juice and milk; mix gently.</text>
    <text x="135" y="1000">5. Shape 8 scones and bake for 15 minutes.</text>
  </g>
  <line x1="120" y1="1080" x2="1080" y2="1080" stroke="#d7cdbf" stroke-width="2"/>
  <text x="120" y="1140" font-family="Georgia, serif" font-size="26" fill="#746b61">Nosh evaluation fixture — not product artwork</text>
</svg>`;

const croppedRecipeSvg = `
<svg width="1200" height="900" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="900" fill="#fffdf8"/>
  <text x="100" y="130" font-family="Georgia, serif" font-size="62" fill="#1f1d1a">Family Vegetable Pie</text>
  <text x="100" y="220" font-family="Arial, sans-serif" font-size="38" font-weight="700">Ingredients</text>
  <g font-family="Arial, sans-serif" font-size="31" fill="#27231f">
    <text x="120" y="285">300 g potatoes, diced</text>
    <text x="120" y="340">2 carrots, sliced</text>
    <text x="120" y="395">1 onion, chopped</text>
    <text x="120" y="450">200 g peas</text>
    <text x="120" y="505">500 ml vegetable stock</text>
    <text x="120" y="560">1 sheet puff pastry</text>
  </g>
  <text x="100" y="665" font-family="Arial, sans-serif" font-size="38" font-weight="700">Method</text>
  <text x="120" y="730" font-family="Arial, sans-serif" font-size="31">1. Cook the vegetables until...</text>
  <rect x="0" y="770" width="1200" height="130" fill="#d8d3ca"/>
  <text x="600" y="845" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" fill="#5d5750">IMAGE ENDS HERE — remaining method is missing</text>
</svg>`;

const splitRecipeIngredientsSvg = `
<svg width="1200" height="1500" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="1500" fill="#f4efe5"/>
  <rect x="72" y="72" width="1056" height="1356" rx="28" fill="#fffdf8" stroke="#6f6558" stroke-width="3"/>
  <text x="120" y="170" font-family="Georgia, serif" font-size="62" fill="#1f1d1a">Sheet Pan Lemon Chicken</text>
  <text x="120" y="230" font-family="Arial, sans-serif" font-size="30" fill="#5a5148">Serves 4 · Screenshot 1 of 2</text>
  <text x="120" y="330" font-family="Arial, sans-serif" font-size="40" font-weight="700" fill="#1f1d1a">Ingredients</text>
  <g font-family="Arial, sans-serif" font-size="32" fill="#27231f">
    <text x="140" y="405">700 g boneless chicken thighs</text>
    <text x="140" y="475">600 g baby potatoes, halved</text>
    <text x="140" y="545">250 g green beans, trimmed</text>
    <text x="140" y="615">2 lemons</text>
    <text x="140" y="685">3 tbsp olive oil</text>
    <text x="140" y="755">3 garlic cloves, minced</text>
    <text x="140" y="825">1 tsp dried oregano</text>
    <text x="140" y="895">1 tsp salt</text>
    <text x="140" y="965">½ tsp black pepper</text>
  </g>
  <line x1="120" y1="1080" x2="1080" y2="1080" stroke="#d7cdbf" stroke-width="2"/>
  <text x="120" y="1150" font-family="Arial, sans-serif" font-size="28" fill="#746b61">Method continues in screenshot 2.</text>
</svg>`;

const splitRecipeMethodSvg = `
<svg width="1200" height="1500" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="1500" fill="#f4efe5"/>
  <rect x="72" y="72" width="1056" height="1356" rx="28" fill="#fffdf8" stroke="#6f6558" stroke-width="3"/>
  <text x="120" y="170" font-family="Georgia, serif" font-size="58" fill="#1f1d1a">Sheet Pan Lemon Chicken</text>
  <text x="120" y="230" font-family="Arial, sans-serif" font-size="30" fill="#5a5148">Screenshot 2 of 2</text>
  <text x="120" y="330" font-family="Arial, sans-serif" font-size="40" font-weight="700" fill="#1f1d1a">Method</text>
  <g font-family="Arial, sans-serif" font-size="31" fill="#27231f">
    <text x="140" y="410">1. Heat the oven to 220°C.</text>
    <text x="140" y="500">2. Toss the potatoes with half the oil,</text>
    <text x="180" y="545">half the garlic, salt, and pepper.</text>
    <text x="140" y="635">3. Roast the potatoes for 15 minutes.</text>
    <text x="140" y="725">4. Add chicken, beans, lemon slices,</text>
    <text x="180" y="770">oregano, and the remaining oil and garlic.</text>
    <text x="140" y="860">5. Roast for 25 minutes, until the chicken</text>
    <text x="180" y="905">is cooked through and potatoes are tender.</text>
    <text x="140" y="995">6. Squeeze over the remaining lemon juice</text>
    <text x="180" y="1040">before serving.</text>
  </g>
</svg>`;

await sharp(Buffer.from(cleanRecipeSvg)).png().toFile(resolve(outputDirectory, 'clean-scones.png'));
await sharp({
  create: {
    width: 1200,
    height: 1500,
    channels: 3,
    background: { r: 0, g: 0, b: 0 },
  },
}).png().toFile(resolve(outputDirectory, 'black.png'));
await sharp(Buffer.from(croppedRecipeSvg)).png().toFile(resolve(outputDirectory, 'cropped-recipe.png'));
await sharp(Buffer.from(splitRecipeIngredientsSvg)).png().toFile(resolve(outputDirectory, 'split-lemon-chicken-1.png'));
await sharp(Buffer.from(splitRecipeMethodSvg)).png().toFile(resolve(outputDirectory, 'split-lemon-chicken-2.png'));

const tinyRecipe = await sharp(Buffer.from(cleanRecipeSvg))
  .resize({ width: 90 })
  .blur(1.6)
  .png()
  .toBuffer();
await sharp(tinyRecipe)
  .resize({ width: 720, kernel: sharp.kernel.nearest })
  .png()
  .toFile(resolve(outputDirectory, 'low-resolution-recipe.png'));

console.log(`Generated ingestion image fixtures in ${outputDirectory}`);
