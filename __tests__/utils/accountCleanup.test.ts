import AsyncStorage from '@react-native-async-storage/async-storage';
import { purgeLocalUserData } from '@/utils/accountCleanup';

describe('local account cleanup', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('removes every user-scoped local artifact without touching another user', async () => {
    await AsyncStorage.multiSet([
      [
        'nosh:cookbook-shelf:v2:user-a',
        JSON.stringify({
          userId: 'user-a',
          cookbooks: [{ id: 'cookbook-from-cache' }],
        }),
      ],
      ['nosh:cookbook-pages:v2:cookbook-from-screen', '{}'],
      ['nosh:cookbook-pages:v2:cookbook-from-cache', '{}'],
      ['nosh:recipe-captures:v1:user-a', '{}'],
      ['@nosh:assistant:user-a:threads', '{}'],
      ['@nosh:assistant:user-a:messages:thread-1', '{}'],
      ['nosh:ai-data-consent:user-a:v1', '{}'],
      ['nosh:first-run:user-a:v1', '{}'],
      ['nosh:bookshelf-scene:v1:user-a', '{}'],
      ['nosh:unseen-cookbook-pages:v1:user-a', '{}'],
      ['@nosh:assistant:user-b:threads', 'keep'],
      ['nosh:first-run:user-b:v1', 'keep'],
      ['unrelated-device-setting', 'keep'],
    ]);

    const result = await purgeLocalUserData({
      userId: 'user-a',
      cookbookIds: ['cookbook-from-screen'],
    });

    expect(result).toEqual({ complete: true, failed: [] });
    expect(await AsyncStorage.getAllKeys()).toEqual(expect.arrayContaining([
      '@nosh:assistant:user-b:threads',
      'nosh:first-run:user-b:v1',
      'unrelated-device-setting',
    ]));
    expect(await AsyncStorage.getAllKeys()).not.toEqual(expect.arrayContaining([
      'nosh:cookbook-shelf:v2:user-a',
      'nosh:cookbook-pages:v2:cookbook-from-screen',
      'nosh:cookbook-pages:v2:cookbook-from-cache',
      'nosh:recipe-captures:v1:user-a',
      '@nosh:assistant:user-a:threads',
      '@nosh:assistant:user-a:messages:thread-1',
      'nosh:ai-data-consent:user-a:v1',
      'nosh:first-run:user-a:v1',
      'nosh:bookshelf-scene:v1:user-a',
      'nosh:unseen-cookbook-pages:v1:user-a',
      'nosh:pending-user-data-purges:v1',
    ]));
  });
});
