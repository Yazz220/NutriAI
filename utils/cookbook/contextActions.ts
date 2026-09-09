export type ContextActionId =
  | 'add_recipe'
  | 'customize_cookbook'
  | 'export_cookbook'
  | 'delete_cookbook'
  | 'edit_recipe'
  | 'redesign_recipe'
  | 'visit_source'
  | 'save_page_image'
  | 'share_recipe'
  | 'move_recipe'
  | 'remove_recipe'
  | 'report_recipe'
  | 'resolve_capture'
  | 'remove_capture';

export interface ContextAction {
  id: ContextActionId;
  title: string;
  systemImage: string;
  destructive?: boolean;
}

export interface ContextActionGroup {
  id: string;
  actions: ContextAction[];
}

interface CookbookActionCapabilities {
  canAddRecipe?: boolean;
  canCustomize?: boolean;
  canExport?: boolean;
  canDelete?: boolean;
}

interface RecipeActionCapabilities {
  canEdit?: boolean;
  canRedesign?: boolean;
  canVisitSource?: boolean;
  canSaveImage?: boolean;
  canShare?: boolean;
  canMove?: boolean;
  canRemove?: boolean;
  canReport?: boolean;
}

export function buildCaptureContextActions(primaryTitle: string): ContextActionGroup[] {
  return [
    {
      id: 'capture-primary',
      actions: [{ id: 'resolve_capture', title: primaryTitle, systemImage: 'arrow.clockwise' }],
    },
    {
      id: 'capture-destructive',
      actions: [{ id: 'remove_capture', title: 'Remove', systemImage: 'trash', destructive: true }],
    },
  ];
}

export function buildCookbookContextActions({
  canAddRecipe = false,
  canCustomize = false,
  canExport = false,
  canDelete = false,
}: CookbookActionCapabilities): ContextActionGroup[] {
  const primary: ContextAction[] = [];
  const sharing: ContextAction[] = [];
  const destructive: ContextAction[] = [];

  if (canAddRecipe) {
    primary.push({ id: 'add_recipe', title: 'Add recipe', systemImage: 'plus' });
  }
  if (canCustomize) {
    primary.push({ id: 'customize_cookbook', title: 'Customize cookbook', systemImage: 'paintbrush' });
  }
  if (canExport) {
    sharing.push({ id: 'export_cookbook', title: 'Download cookbook PDF', systemImage: 'arrow.down.doc' });
  }
  if (canDelete) {
    destructive.push({
      id: 'delete_cookbook',
      title: 'Delete cookbook',
      systemImage: 'trash',
      destructive: true,
    });
  }

  return compactGroups([
    { id: 'cookbook-primary', actions: primary },
    { id: 'cookbook-sharing', actions: sharing },
    { id: 'cookbook-destructive', actions: destructive },
  ]);
}

export function buildRecipeContextActions({
  canEdit = false,
  canRedesign = false,
  canVisitSource = false,
  canSaveImage = false,
  canShare = false,
  canMove = false,
  canRemove = false,
  canReport = false,
}: RecipeActionCapabilities): ContextActionGroup[] {
  const editing: ContextAction[] = [];
  const sharing: ContextAction[] = [];
  const organization: ContextAction[] = [];
  const reporting: ContextAction[] = [];
  const destructive: ContextAction[] = [];

  if (canEdit) {
    editing.push({ id: 'edit_recipe', title: 'Edit recipe', systemImage: 'pencil' });
  }
  if (canRedesign) {
    editing.push({ id: 'redesign_recipe', title: 'Try another design', systemImage: 'arrow.triangle.2.circlepath' });
  }
  if (canVisitSource) {
    sharing.push({ id: 'visit_source', title: 'Visit original source', systemImage: 'safari' });
  }
  if (canSaveImage) {
    sharing.push({ id: 'save_page_image', title: 'Save page image', systemImage: 'square.and.arrow.down' });
  }
  if (canShare) {
    sharing.push({ id: 'share_recipe', title: 'Share recipe', systemImage: 'square.and.arrow.up' });
  }
  if (canMove) {
    organization.push({ id: 'move_recipe', title: 'Move to another cookbook', systemImage: 'books.vertical' });
  }
  if (canReport) {
    reporting.push({ id: 'report_recipe', title: 'Report issue or content', systemImage: 'flag' });
  }
  if (canRemove) {
    destructive.push({
      id: 'remove_recipe',
      title: 'Remove from cookbook',
      systemImage: 'trash',
      destructive: true,
    });
  }

  return compactGroups([
    { id: 'recipe-editing', actions: editing },
    { id: 'recipe-sharing', actions: sharing },
    { id: 'recipe-organization', actions: organization },
    { id: 'recipe-reporting', actions: reporting },
    { id: 'recipe-destructive', actions: destructive },
  ]);
}

export function flattenContextActions(groups: ContextActionGroup[]): ContextAction[] {
  return groups.flatMap((group) => group.actions);
}

function compactGroups(groups: ContextActionGroup[]): ContextActionGroup[] {
  return groups.filter((group) => group.actions.length > 0);
}
