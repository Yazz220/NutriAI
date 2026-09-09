import {
  assessRecipeQuality,
  confirmRecipeQualityIssues,
  readRecipeQualityAssessment,
  withRecipeQualityAssessment,
  type RecipeQualityCandidate,
} from '@/supabase/functions/_shared/recipeQuality';

function recipe(overrides: Partial<RecipeQualityCandidate> = {}): RecipeQualityCandidate {
  return {
    title: 'Roasted tomato pasta',
    servings: 4,
    yieldText: 'Serves 4',
    prepTimeMinutes: 15,
    cookTimeMinutes: 30,
    totalTimeMinutes: 45,
    ingredientGroups: [{
      id: 'default',
      ingredients: [
        { name: 'tomatoes', quantity: '500', unit: 'g' },
        { name: 'pasta', quantity: '300', unit: 'g' },
        { name: 'olive oil', quantity: '2', unit: 'tbsp' },
        { name: 'salt', quantity: '1', unit: 'tsp' },
      ],
    }],
    stepGroups: [{
      id: 'default',
      steps: [
        { id: 'step-1', text: 'Roast the tomatoes at 200°C for 20 minutes.' },
        { id: 'step-2', text: 'Boil the pasta for 10 minutes, then combine.' },
      ],
    }],
    provenance: { sourceType: 'text', confidence: 0.9, inferredFields: [] },
    ...overrides,
  };
}

describe('recipe quality assessment', () => {
  it('auto-publishes a complete, internally consistent recipe', () => {
    const assessment = assessRecipeQuality(recipe());

    expect(assessment.decision).toBe('auto_publish');
    expect(assessment.issues).toEqual([]);
    expect(assessment.metrics).toMatchObject({
      ingredientCount: 4,
      quantifiedIngredientCount: 4,
      stepCount: 2,
      hasCookingTemperature: true,
      hasCookingDuration: true,
    });
  });

  it('requires correction when an otherwise complete ingredient list has no amounts', () => {
    const assessment = assessRecipeQuality(recipe({
      ingredientGroups: [{
        id: 'default',
        ingredients: [
          { name: 'flour' },
          { name: 'milk' },
          { name: 'eggs' },
        ],
      }],
    }));

    expect(assessment.decision).toBe('needs_correction');
    expect(assessment.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'missing_ingredient_quantities', severity: 'blocking' }),
    ]));
  });

  it('does not treat intentionally vague ingredients as missing quantities', () => {
    const assessment = assessRecipeQuality(recipe({
      ingredientGroups: [{
        id: 'default',
        ingredients: [
          { name: 'tomatoes', quantity: '4' },
          { name: 'salt to taste' },
          { name: 'olive oil as needed' },
        ],
      }],
    }));

    expect(assessment.issues.map((issue) => issue.code)).not.toContain('missing_ingredient_quantities');
  });

  it('requires correction when a baking method has no oven temperature', () => {
    const assessment = assessRecipeQuality(recipe({
      stepGroups: [{
        id: 'default',
        steps: [{ id: 'step-1', text: 'Bake for 25 minutes until golden.' }],
      }],
    }));

    expect(assessment.decision).toBe('needs_correction');
    expect(assessment.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'missing_baking_temperature', severity: 'blocking' }),
    ]));
  });

  it('does not mistake baking powder in a stovetop method for oven use', () => {
    const assessment = assessRecipeQuality(recipe({
      stepGroups: [{
        id: 'default',
        steps: [
          { id: 'step-1', text: 'Whisk the flour, baking powder, and sugar together.' },
          { id: 'step-2', text: 'Cook ladles of batter on a hot pan for 2 minutes per side.' },
        ],
      }],
    }));

    expect(assessment.issues.map((issue) => issue.code)).not.toContain('missing_baking_temperature');
  });

  it('requires correction when numeric servings conflict with the source yield', () => {
    const assessment = assessRecipeQuality(recipe({ servings: 4, yieldText: 'Serves 8' }));

    expect(assessment.decision).toBe('needs_correction');
    expect(assessment.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'serving_yield_conflict', severity: 'blocking' }),
    ]));
  });

  it('requires correction when total time contradicts a recipe stage', () => {
    const assessment = assessRecipeQuality(recipe({
      prepTimeMinutes: 15,
      cookTimeMinutes: 30,
      totalTimeMinutes: 20,
    }));

    expect(assessment.decision).toBe('needs_correction');
    expect(assessment.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'inconsistent_recipe_time', severity: 'blocking' }),
    ]));
  });

  it('requires correction when a time value is not a valid minute count', () => {
    const assessment = assessRecipeQuality(recipe({ cookTimeMinutes: 'thirty' }));

    expect(assessment.decision).toBe('needs_correction');
    expect(assessment.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'invalid_recipe_time', fieldPaths: ['cookTimeMinutes'] }),
    ]));
  });

  it('records inferred cooking details internally without blocking the cookbook page', () => {
    const assessment = assessRecipeQuality(recipe({
      provenance: {
        sourceType: 'image',
        confidence: 0.7,
        inferredFields: ['stepGroups.0.steps.0.temperature'],
      },
    }));

    expect(assessment.decision).toBe('publish_with_note');
    expect(assessment.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'critical_field_inferred', severity: 'warning' }),
    ]));
  });

  it('keeps softer completeness gaps as non-blocking notes', () => {
    const assessment = assessRecipeQuality(recipe({
      cookTimeMinutes: undefined,
      totalTimeMinutes: undefined,
      stepGroups: [{
        id: 'default',
        steps: [{ id: 'step-1', text: 'Simmer gently until the sauce thickens.' }],
      }],
    }));

    expect(assessment.decision).toBe('publish_with_note');
    expect(assessment.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'missing_cooking_duration', severity: 'warning' }),
    ]));
  });

  it('can retain an explicit review internally without turning it into page commentary', () => {
    const candidate = recipe({
      provenance: {
        sourceType: 'image',
        confidence: 0.7,
        inferredFields: ['stepGroups.0.steps.0.temperature'],
      },
    });
    const firstAssessment = assessRecipeQuality(candidate);
    const assessed = withRecipeQualityAssessment(candidate, firstAssessment);
    const confirmed = confirmRecipeQualityIssues(
      assessed,
      firstAssessment.issues.map((issue) => issue.key),
    );
    const reassessment = assessRecipeQuality(confirmed);

    expect(reassessment.decision).toBe('publish_with_note');
    expect(reassessment.issues.find((issue) => issue.code === 'critical_field_inferred')).toMatchObject({
      confirmed: true,
    });
  });

  it('does not let confirmation bypass missing source facts', () => {
    const candidate = recipe({
      ingredientGroups: [{
        id: 'default',
        ingredients: [{ name: 'flour' }, { name: 'milk' }, { name: 'eggs' }],
      }],
    });
    const firstAssessment = assessRecipeQuality(candidate);
    const confirmed = confirmRecipeQualityIssues(
      candidate,
      firstAssessment.issues.map((issue) => issue.key),
    );

    expect(assessRecipeQuality(confirmed).decision).toBe('needs_correction');
  });

  it('stores and reads the versioned assessment on recipe provenance', () => {
    const candidate = recipe();
    const assessment = assessRecipeQuality(candidate);
    const assessed = withRecipeQualityAssessment(candidate, assessment);

    expect(readRecipeQualityAssessment(assessed)).toEqual(assessment);
    expect(candidate.provenance.qualityAssessment).toBeUndefined();
  });

  it('retains the first blocking assessment after a corrected graph passes', () => {
    const incomplete = recipe({
      stepGroups: [{
        id: 'default',
        steps: [{ id: 'step-1', text: 'Bake for 25 minutes.' }],
      }],
    });
    const firstAssessment = assessRecipeQuality(incomplete);
    const firstGraph = withRecipeQualityAssessment(incomplete, firstAssessment);
    const corrected = {
      ...firstGraph,
      stepGroups: [{
        id: 'default',
        steps: [{ id: 'step-1', text: 'Bake at 190°C for 25 minutes.' }],
      }],
    };
    const finalGraph = withRecipeQualityAssessment(corrected, assessRecipeQuality(corrected));

    expect(finalGraph.provenance.qualityAssessment?.decision).toBe('auto_publish');
    expect(finalGraph.provenance.qualityInitialAssessment).toEqual(firstAssessment);
  });
});
