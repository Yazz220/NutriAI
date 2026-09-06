const { withAppDelegate } = require('expo/config-plugins');

const marker = '// Folio persistent cookbook images (re-downloadable; excluded from backup).';
function configureAppDelegate(source) {
  if (source.includes(marker)) return source;
  const entry = /didFinishLaunchingWithOptions[^]*?\) -> Bool \{/;
  if (!entry.test(source)) throw new Error('Could not configure Folio local image storage in AppDelegate.');
  return source.replace(
    entry,
    (match) => `${match}
    ${marker}
    do {
      var directory = try FileManager.default.url(for: .documentDirectory, in: .userDomainMask, appropriateFor: nil, create: true)
        .appendingPathComponent("folio-page-images-v1", isDirectory: true)
      try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
      var values = URLResourceValues()
      values.isExcludedFromBackup = true
      try directory.setResourceValues(values)
    } catch {
      NSLog("Folio local image storage setup failed: %@", error.localizedDescription)
    }
`,
  );
}

module.exports = (config) =>
  withAppDelegate(config, (mod) => {
    if (mod.modResults.language !== 'swift') throw new Error('Folio local image storage requires a Swift AppDelegate.');
    mod.modResults.contents = configureAppDelegate(mod.modResults.contents);
    return mod;
  });
module.exports.configureAppDelegate = configureAppDelegate;
