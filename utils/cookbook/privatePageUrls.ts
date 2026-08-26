import { supabase } from '@/lib/supabase';

export const COOKBOOK_PAGE_BUCKET = 'cookbook-pages';
export const COOKBOOK_PAGE_URL_TTL_SECONDS = 60 * 60;

export interface StoredPageImage {
  image_url?: string | null;
  storage_path?: string | null;
}
/** Replaces durable Storage paths with short-lived URLs for the signed-in user. */
export async function signStoredPageImages<T extends StoredPageImage>(rows: T[]): Promise<T[]> {
  const paths = [...new Set(rows
    .map((row) => row.storage_path)
    .filter((path): path is string => Boolean(path)))];

  if (paths.length === 0) return rows;

  const { data, error } = await supabase.storage
    .from(COOKBOOK_PAGE_BUCKET)
    .createSignedUrls(paths, COOKBOOK_PAGE_URL_TTL_SECONDS);

  if (error) throw error;

  const signedUrls = new Map(
    (data ?? [])
      .filter((item) => item.signedUrl)
      .map((item) => [item.path, item.signedUrl] as const),
  );

  return rows.map((row) => {
    if (!row.storage_path) return row;
    const signedUrl = signedUrls.get(row.storage_path);
    if (!signedUrl) throw new Error('Could not authorize access to a cookbook page image.');
    return { ...row, image_url: signedUrl };
  });
}
