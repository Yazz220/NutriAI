/**
 * Dynamic Expo config — reads APP_VARIANT to create separate dev/production apps.
 *
 * Production:  "Folio"       com.yaz12.nosh       scheme: nosh
 * Development: "Folio (Dev)" com.yaz12.nosh.dev   scheme: nosh
 *
 * Scheme stays "nosh" for both variants so Metro QR codes (exp+nosh://)
 * are handled correctly by the dev build. The bundle ID differentiates
 * the apps for side-by-side install.
 *
 * Build commands:
 *   eas build --profile development   → installs "Folio (Dev)" on device
 *   eas build --profile preview       → installs "Folio" for TestFlight
 *   eas build --profile production    → App Store submission
 */

const IS_DEV = process.env.APP_VARIANT === "development";

function withVariantShareIdentifiers(plugins = []) {
  if (!IS_DEV) return plugins;
  return plugins.map((plugin) => {
    if (!Array.isArray(plugin) || plugin[0] !== "expo-share-intent") return plugin;
    return [
      plugin[0],
      {
        ...plugin[1],
        iosShareExtensionBundleIdentifier: "com.yaz12.nosh.dev.share",
        iosAppGroupIdentifier: "group.com.yaz12.nosh.dev.share",
      },
    ];
  });
}

module.exports = ({ config }) => ({
  ...config,
  // Folio is the display and generated target name. Stable bundle identifiers
  // and the nosh:// URL scheme remain unchanged for compatibility.
  // The home-screen display name is overridden via infoPlist for dev builds.
  name: "Folio",
  scheme: config.scheme || "nosh",
  plugins: withVariantShareIdentifiers(config.plugins),
  ios: {
    ...config.ios,
    bundleIdentifier: IS_DEV
      ? `${config.ios.bundleIdentifier}.dev`
      : config.ios.bundleIdentifier,
    infoPlist: {
      ...config.ios?.infoPlist,
      // Override the display name on the home screen for dev builds
      ...(IS_DEV ? { CFBundleDisplayName: "Folio (Dev)" } : {}),
    },
  },
  android: {
    ...config.android,
    package: IS_DEV
      ? `${config.android.package}.dev`
      : config.android.package,
  },
});
