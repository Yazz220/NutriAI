# Native Share to Nosh feasibility

> Historical research supporting the current native-share implementation. For the live flow and ownership boundaries, use `docs/PRODUCT_FLOW.md` and `docs/ARCHITECTURE.md`.

## Decision

Use `expo-share-intent` 5.1.1 for Expo SDK 54. It is an Expo native module with one JavaScript ingestion path for iOS and Android. Nosh does not run Supabase authentication or recipe processing inside the iOS extension.

The iOS extension writes the handoff into an App Group and opens the main app. The authenticated app uploads private images and calls the existing durable capture endpoint. Android uses single-item `ACTION_SEND` filters for `text/*` and `image/*` and follows the same app-level path.

This choice keeps the extension small and prevents service-role keys, provider keys, or user sessions from entering extension code.

## Supported first slice

- One URL
- One selected text payload
- One image up to 15 MB, with optional shared text retained as extraction notes

Video, multiple files, audio, and a custom iOS extension interface are not advertised.

## Failure rules

- Signed out: keep the App Group handoff and save only after authentication.
- Offline: do not clear the native handoff or report Saved. Show retry.
- Duplicate delivery: reuse the same request key for the same payload within ten minutes.
- Success: clear the native handoff only after `begin_recipe_capture` returns a durable capture.
- Backgrounding: do not reset the share intent. Extraction continues through the capture Edge Function.

## Build facts

- Expo's official `expo-sharing` module only sends outbound shares and cannot register an app as an inbound share target.
- `expo-share-intent` 5.x declares Expo SDK 54 support and requires a development build rather than Expo Go.
- The config plugin declares the iOS extension for EAS credentials and creates Android intent filters.
- Development and production variants use separate extension bundle IDs and App Groups.
- Android prebuild generation passed on Windows. iOS target generation and device validation require macOS or EAS Build.

## Sources

- [Expo Sharing SDK 54 limitations](https://docs.expo.dev/versions/v54.0.0/sdk/sharing/)
- [Expo iOS app extension configuration](https://docs.expo.dev/build-reference/app-extensions/)
- [`expo-share-intent` SDK compatibility and payload contract](https://github.com/achorein/expo-share-intent/tree/v5.1.1)
