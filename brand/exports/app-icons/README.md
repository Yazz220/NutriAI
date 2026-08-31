# App icon exports

These PNGs are generated from the SVG masters in `../../masters/app-icon/`.

## iOS

`ios/nosh-app-icon-1024.png` is the primary App Store source. It is a square, opaque, sRGB PNG with no baked rounded corners or platform shadow. Smaller files are review and platform-size exports from the same master.

The dark, monochrome, and inverted 1024 px files preserve the approved symbol geometry while changing only color and background treatment.

## Android

- `android/nosh-adaptive-foreground-1024.png` has a transparent background and keeps the symbol inside the adaptive safe zone.
- `android/nosh-adaptive-background-1024.png` is an opaque Paper Ivory background layer.
- `android/nosh-adaptive-monochrome-1024.png` is a one-color transparent foreground for themed icons.

## Web

The files in `web/` are opaque exports for favicons, touch icons, and web app manifests.

Do not edit these PNGs by hand. Update the corresponding SVG master and regenerate the exports.

From the project root, run `npm run brand:generate`.
