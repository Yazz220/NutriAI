/**
 * Dynamic Expo config — reads APP_VARIANT to create separate dev/production apps.
 *
 * Production:  "Nosh"       com.yaz12.nosh       scheme: nosh
 * Development: "Nosh (Dev)" com.yaz12.nosh.dev   scheme: nosh
 *
 * Scheme stays "nosh" for both variants so Metro QR codes (exp+nosh://)
 * are handled correctly by the dev build. The bundle ID differentiates
 * the apps for side-by-side install.
 *
 * Build commands:
 *   eas build --profile development   → installs "Nosh (Dev)" on device
 *   eas build --profile preview       → installs "Nosh" for TestFlight
 *   eas build --profile production    → App Store submission
 */

const IS_DEV = process.env.APP_VARIANT === "development";

module.exports = ({ config }) => ({
  ...config,
  // Keep name as "Nosh" always so the Xcode target stays consistent.
  // The home-screen display name is overridden via infoPlist for dev builds.
  name: "Nosh",
  scheme: config.scheme || "nosh",
  ios: {
    ...config.ios,
    bundleIdentifier: IS_DEV
      ? `${config.ios.bundleIdentifier}.dev`
      : config.ios.bundleIdentifier,
    infoPlist: {
      ...config.ios?.infoPlist,
      // Override the display name on the home screen for dev builds
      ...(IS_DEV ? { CFBundleDisplayName: "Nosh (Dev)" } : {}),
    },
  },
  android: {
    ...config.android,
    package: IS_DEV
      ? `${config.android.package}.dev`
      : config.android.package,
  },
});
