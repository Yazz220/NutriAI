import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

describe('release privacy contracts', () => {
  it('declares the release privacy manifest without microphone access', () => {
    const appConfig = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'));
    const ios = appConfig.expo.ios;
    const android = appConfig.expo.android;
    const accessedApiTypes = ios.privacyManifests.NSPrivacyAccessedAPITypes;

    expect(ios.infoPlist.NSMicrophoneUsageDescription).toBeUndefined();
    expect(android.permissions).not.toContain('android.permission.RECORD_AUDIO');
    expect(ios.privacyManifests.NSPrivacyTracking).toBe(false);
    expect(accessedApiTypes).toEqual(expect.arrayContaining([
      expect.objectContaining({
        NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryFileTimestamp',
        NSPrivacyAccessedAPITypeReasons: expect.arrayContaining(['C617.1']),
      }),
      expect.objectContaining({
        NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryUserDefaults',
        NSPrivacyAccessedAPITypeReasons: expect.arrayContaining(['CA92.1', '1C8F.1']),
      }),
    ]));
  });

  it('keeps generated cookbook pages private and stops persisting public URLs', () => {
    const migration = fs.readFileSync(path.join(
      root,
      'supabase/migrations/20260825214540_make_cookbook_pages_private.sql',
    ), 'utf8');
    const generator = fs.readFileSync(path.join(
      root,
      'supabase/functions/generate-page-art/index.ts',
    ), 'utf8');

    expect(migration).toContain('set public = false');
    expect(migration).toContain("bucket_id = 'cookbook-pages'");
    expect(migration).toContain("(storage.foldername(name))[1] = (select auth.uid())::text");
    expect(generator).not.toContain('.getPublicUrl(storagePath)');
    expect(generator).toContain('image_url: null');
  });

  it('revokes Apple authorization before removing storage and the Supabase user', () => {
    const deletionFunction = fs.readFileSync(path.join(
      root,
      'supabase/functions/delete-account/index.ts',
    ), 'utf8');
    const revokeIndex = deletionFunction.indexOf('await revokeAppleAuthorization');
    const storageIndex = deletionFunction.indexOf('const [captureObjectsRemoved');
    const deleteUserIndex = deletionFunction.indexOf('adminClient.auth.admin.deleteUser');

    expect(revokeIndex).toBeGreaterThan(-1);
    expect(storageIndex).toBeGreaterThan(revokeIndex);
    expect(deleteUserIndex).toBeGreaterThan(storageIndex);
  });
});
