import { execFileSync } from 'node:child_process';
const { configureAppDelegate } = require('../../../plugins/withLocalCookbookStorage');

it('configures the installed Expo template before React starts and remains idempotent', () => {
  const template = execFileSync(
    'tar',
    ['-xOf', 'node_modules/expo/template.tgz', 'package/ios/HelloWorld/AppDelegate.swift'],
    { encoding: 'utf8' },
  );
  const configured = configureAppDelegate(template);
  expect(configured).toContain('values.isExcludedFromBackup = true');
  expect(configured.indexOf('values.isExcludedFromBackup')).toBeLessThan(
    configured.indexOf('factory.startReactNative'),
  );
  expect(configureAppDelegate(configured)).toBe(configured);
  expect(() => configureAppDelegate('unknown native template')).toThrow('Could not configure');
});
