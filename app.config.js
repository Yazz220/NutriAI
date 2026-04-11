/**
 * Dynamic Expo config — reads APP_VARIANT to create separate dev/production apps.
 *
 * Production:  "Nosh"       com.yaz12.nosh       scheme: nosh
 * Development: "Nosh (Dev)" com.yaz12.nosh.dev   scheme: nosh-dev
 *
 * Build commands:
 *   eas build --profile development   → installs "Nosh (Dev)" on device
 *   eas build --profile preview       → installs "Nosh" for TestFlight
 *   eas build --profile production    → App Store submission
 */

const IS_DEV = process.env.APP_VARIANT === "development";

// Load static app.json as base
const config = require("./app.json").expo;

module.exports = () => ({
  ...config,
  name: IS_DEV ? "Nosh (Dev)" : config.name,
  scheme: IS_DEV ? "nosh-dev" : config.scheme,
  ios: {
    ...config.ios,
    bundleIdentifier: IS_DEV
      ? `${config.ios.bundleIdentifier}.dev`
      : config.ios.bundleIdentifier,
  },
  android: {
    ...config.android,
    package: IS_DEV
      ? `${config.android.package}.dev`
      : config.android.package,
  },
});
