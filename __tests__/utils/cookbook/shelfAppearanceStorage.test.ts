import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_BOOKSHELF_SCENE } from '@/constants/shelfAppearance';
import {
  clearBookshelfScene,
  loadBookshelfScene,
  saveBookshelfScene,
} from '@/utils/cookbook/shelfAppearanceStorage';

describe('bookshelf scene storage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('uses the canonical scene when no preference exists', async () => {
    await expect(loadBookshelfScene('reader-1')).resolves.toEqual(DEFAULT_BOOKSHELF_SCENE);
  });

  it('persists the shelf independently of cookbook data', async () => {
    await saveBookshelfScene('reader-1', {
      shelfStyleId: 'floating-oak',
      wallpaperStyleId: 'botanical-paper',
    });

    await expect(loadBookshelfScene('reader-1')).resolves.toEqual({
      shelfStyleId: 'floating-oak',
      wallpaperStyleId: 'botanical-paper',
    });
  });

  it('preserves a valid shelf while falling back from a removed wallpaper', async () => {
    await AsyncStorage.setItem(
      'nosh:bookshelf-scene:v1:reader-1',
      JSON.stringify({ shelfStyleId: 'floating-oak', wallpaperStyleId: 'retired-wallpaper' }),
    );

    await expect(loadBookshelfScene('reader-1')).resolves.toEqual({
      shelfStyleId: 'floating-oak',
      wallpaperStyleId: 'paper-ivory',
    });
  });

  it('falls back safely when a removed shelf id is stored', async () => {
    await AsyncStorage.setItem(
      'nosh:bookshelf-scene:v1:reader-1',
      JSON.stringify({ shelfStyleId: 'retired-shelf', wallpaperStyleId: 'paper-ivory' }),
    );

    await expect(loadBookshelfScene('reader-1')).resolves.toEqual(DEFAULT_BOOKSHELF_SCENE);
  });

  it('clears the preference with local account data', async () => {
    await saveBookshelfScene('reader-1', {
      shelfStyleId: 'floating-oak',
      wallpaperStyleId: 'paper-ivory',
    });

    await clearBookshelfScene('reader-1');

    await expect(loadBookshelfScene('reader-1')).resolves.toEqual(DEFAULT_BOOKSHELF_SCENE);
  });
});
