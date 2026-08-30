import {
  buildCookbookContextActions,
  buildRecipeContextActions,
  flattenContextActions,
} from '@/utils/cookbook/contextActions';
import { buildContextActionSheetModel } from '@/utils/cookbook/contextActionPresenter';

describe('context actions', () => {
  it('builds cookbook actions from capabilities and keeps delete last', () => {
    const actions = flattenContextActions(
      buildCookbookContextActions({
        canAddRecipe: true,
        canRename: true,
        canExport: true,
        canDelete: true,
      }),
    );

    expect(actions.map((action) => action.id)).toEqual([
      'add_recipe',
      'rename_cookbook',
      'export_cookbook',
      'delete_cookbook',
    ]);
    expect(actions.at(-1)).toMatchObject({ id: 'delete_cookbook', destructive: true });
  });

  it('omits recipe actions that the current page cannot perform', () => {
    const actions = flattenContextActions(
      buildRecipeContextActions({
        canVisitSource: true,
        canShare: true,
        canRemove: true,
      }),
    );

    expect(actions.map((action) => action.id)).toEqual(['visit_source', 'share_recipe', 'remove_recipe']);
    expect(actions.at(-1)).toMatchObject({ id: 'remove_recipe', destructive: true });
  });

  it('returns no empty menu groups', () => {
    expect(buildCookbookContextActions({})).toEqual([]);
    expect(buildRecipeContextActions({})).toEqual([]);
  });

  it('maps actions to an iOS action sheet without losing destructive intent', () => {
    const model = buildContextActionSheetModel(
      buildCookbookContextActions({ canAddRecipe: true, canRename: true, canDelete: true }),
    );

    expect(model.options).toEqual(['Add recipe', 'Rename cookbook', 'Delete cookbook', 'Cancel']);
    expect(model.ids).toEqual(['add_recipe', 'rename_cookbook', 'delete_cookbook']);
    expect(model.destructiveButtonIndices).toEqual([2]);
    expect(model.cancelButtonIndex).toBe(3);
  });
});
