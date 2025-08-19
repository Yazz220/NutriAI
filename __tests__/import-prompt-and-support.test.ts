import { buildPrompt } from '../utils/promptRegistry';
import { computeSupportRates } from '../utils/universalImport';
import { recordAbstain, getRecentAbstains } from '../utils/importTelemetry';

describe('Prompt registry', () => {
  test('text conservative prompt is strict and conservative', () => {
    const { system } = buildPrompt('import.text', 'conservative');
    expect(system).toMatch(/STRICT JSON/i);
    expect(system).toMatch(/Policy: conservative/i);
    expect(system).not.toMatch(/guess|hallucinate/i);
  });

  test('reconcile prompt exists and is evidence-bound', () => {
    const { system } = buildPrompt('import.reconcile', 'conservative');
    expect(system).toMatch(/STRICT JSON/i);
    expect(system).toMatch(/REMOVE/i); // removal of unsupported items
    expect(system).toMatch(/evidence/i);
  });
});

describe('Evidence support computation', () => {
  test('high support when tokens appear in evidence', () => {
    const evidence = `2 cups flour\n1 tsp salt\nMix flour with salt. Bake.`;
    const recipe = {
      ingredients: [
        { name: 'flour' },
        { name: 'salt' },
      ],
      steps: ['Mix flour with salt', 'Bake'],
    };
    const { ingredientSupport, stepSupport } = computeSupportRates(evidence, recipe);
    expect(ingredientSupport).toBeGreaterThanOrEqual(1);
    expect(stepSupport).toBeGreaterThanOrEqual(1);
  });

  test('low support when tokens absent', () => {
    const evidence = `water only`;
    const recipe = {
      ingredients: [ { name: 'flour' } ],
      steps: ['Bake']
    };
    const { ingredientSupport, stepSupport } = computeSupportRates(evidence, recipe);
    expect(ingredientSupport).toBeLessThan(0.5);
    expect(stepSupport).toBeLessThan(0.5);
  });
});

describe('Telemetry ring buffer', () => {
  test('records abstains and caps at 20', () => {
    for (let i = 0; i < 25; i++) {
      recordAbstain({ source: 'text', reason: `r${i}` });
    }
    const items = getRecentAbstains();
    expect(items.length).toBeLessThanOrEqual(20);
    // Latest first
    expect(items[0].reason).toBe('r24');
  });
});
