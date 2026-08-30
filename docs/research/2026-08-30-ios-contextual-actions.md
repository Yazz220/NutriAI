# iOS contextual actions for Nosh

Date: 2026-08-30

## Recommendation

Use Apple's system menus, but do not make long-press the only way to manage a cookbook or recipe page.

Nosh should have one canonical action model per object and two entrances to it:

1. A visible `More` control opens the object's secondary actions on a normal tap.
2. A long-press on the object opens the same actions as a faster contextual shortcut.

Tap keeps its primary meaning: open a book, open or focus a page, or choose a visible primary command. Long-press never changes the object's primary meaning. Destructive commands appear last, use the system destructive treatment, and open a separate confirmation surface before changing data.

For the current Expo SDK 54 / React Native 0.81.5 app, the strongest first implementation candidate is a narrowly scoped pilot of `@react-native-menu/menu@2.0.0`. It exposes iOS 14+ `UIMenu`, Android `PopupMenu`, SF Symbols, destructive and disabled attributes, submenus, and both tap and long-press activation from one API. It also keeps the action data in React Native, which makes it practical to feed both entrances from one action registry.

This should be treated as a device-build compatibility gate, not assumed safe from its README alone. SDK 54 uses the New Architecture by default, and the package has had RN 0.81 / Expo 54 reports around native builds, Fabric lifecycle behavior, and long-press previews. Pin the exact package version, build the real development client, and verify iOS 18 and the current iOS release before making it foundational. If that pilot is unreliable, the fallback should be a small Nosh-owned Expo Module wrapping UIKit's `UIMenu` / `UIContextMenuInteraction`, not a custom JavaScript imitation of an Apple menu.

## Product interaction rules

| Object or surface | Tap | Long-press | Visible secondary entrance |
| --- | --- | --- | --- |
| Cookbook on shelf | Open cookbook | Show cookbook actions | `More` on the focused/selected book, with an accessible label |
| Recipe page in reader | Preserve reading/page navigation behavior | Show page actions only when it doesn't compete with the page-turn gesture | Reader `More` control |
| Page thumbnail in organizer | Open or jump to page | Show page actions; drag remains the reorder gesture | Thumbnail `More` when selected, if needed |
| Empty shelf/workspace | Use a visible create action | No required hidden gesture | Visible Add/Create button |

The menu contents should be short and contextual. For example:

- Cookbook: Customize, Add recipe, Share, Delete cookbook.
- Recipe page: Edit recipe, Try another design, Save image, Share recipe, then destructive page removal if that action exists.

Primary/high-frequency tasks should not be buried in the menu. In the reader, page-turning and opening Ask Nosh remain direct. On the shelf, opening a book remains direct. A system menu is for compact secondary commands, not a replacement for the whole interface.

Long-press on the reader needs particular care. The physical page engine already owns drag and edge gestures, so the context gesture must fail cleanly when a page turn begins and must not introduce a second page-physics path. A long-press accelerator is safest on a stable page region or in the organizer; the visible reader menu remains the reliable route.

## Why this matches iOS

Apple's context-menu guidance makes four constraints explicit:

- Context menus are hidden, so people may not know they exist.
- Their commands must also remain available in the main interface.
- Menus should contain a small number of relevant actions and behave consistently throughout the app.
- Destructive items belong at the end and must use the destructive treatment.

Apple separately recommends a `More` pull-down button for secondary actions where space is constrained, while warning that the ellipsis reduces predictability. It says not to put every action in one pull-down menu and recommends a distinct action sheet or popover to confirm destructive choices.

That supports a paired model: visible `More` for discovery, long-press for fluency, and one shared command list behind both. The native surface also gives Nosh the system's current typography, placement, SF Symbols, accessibility behavior, red destructive styling, and OS-specific visual treatment without recreating those details.

Sources: [Apple HIG: Context menus](https://developer.apple.com/design/human-interface-guidelines/context-menus), [Apple HIG: Pull-down buttons](https://developer.apple.com/design/human-interface-guidelines/pull-down-buttons), [Apple HIG: Action sheets](https://developer.apple.com/design/human-interface-guidelines/action-sheets), [UIKit menus and shortcuts](https://developer.apple.com/documentation/uikit/menus-and-shortcuts).

## Accessibility requirements

Long-press cannot be an accessibility contract by itself. React Native documents the standard `longpress` accessibility action as Android-only. Each book/page needs an accessible label and hint, its visible menu control needs a specific label such as `More actions for Week Night Table Recipes`, and the object's action list should also be exposed through `accessibilityActions` / `onAccessibilityAction` where useful.

The primary accessibility action must match tap. Custom actions should use localized, unambiguous labels. Destructive operations still route through the same confirmation flow, regardless of whether they begin from touch, VoiceOver, or the visible menu.

Sources: [React Native accessibility actions](https://reactnative.dev/docs/accessibility#accessibility-actions), [React Native Pressable](https://reactnative.dev/docs/pressable).

## SDK 54 implementation assessment

### `@react-native-menu/menu@2.0.0` — best pilot

Advantages:

- Uses iOS 14+ `UIMenu`, with an action-sheet fallback for iOS 13.
- Provides tap or long-press opening through `shouldOpenOnLongPress`.
- Supports SF Symbols, destructive/disabled/hidden attributes, checked states, and one-level subactions.
- Has a relatively small, data-driven API that can consume a shared Nosh action definition.
- Also maps to Android `PopupMenu`, so the action architecture does not become iOS-only.

Risks:

- It contains native code and requires a rebuilt development client.
- Expo SDK 54 / RN 0.81 reports show that older package versions are unsafe, and there are still open edge cases around New Architecture builds and long-press previews in Fabric.
- A successful Metro/web run proves nothing about the native menu; it must be compiled and tested on iOS.

Sources: [`@react-native-menu/menu` README](https://github.com/react-native-menu/menu/blob/master/README.md), [Expo 54 / RN 0.81 compatibility report](https://github.com/react-native-menu/menu/issues/1170), [Fabric long-press preview report](https://github.com/react-native-menu/menu/issues/1201), [npm package metadata](https://www.npmjs.com/package/@react-native-menu/menu).

### `@expo/ui` ContextMenu — native, but not the launch choice on SDK 54

Expo SDK 54 includes a SwiftUI `ContextMenu` in `@expo/ui`, and it is appealing because it is first-party, native, and New-Architecture compatible through Expo Modules. However, the SDK 54 release is explicitly beta and subject to breaking changes. It crosses from React Native into SwiftUI through `Host` / `UIHostingController`, and Expo has documented and tracked layout/recycling issues when context-menu hosts live in scrollable or virtualized React Native lists. A shelf is exactly the kind of high-value scrolling surface where this risk is undesirable before launch.

Re-evaluate it after an Expo SDK upgrade and a focused shelf prototype; do not make the production action system depend on the SDK 54 beta.

Sources: [Expo SDK 54 SwiftUI components](https://docs.expo.dev/versions/v54.0.0/sdk/ui/swift-ui/), [Expo UI ContextMenu scroll/recycling issue](https://github.com/expo/expo/issues/40604), [Expo Modules overview](https://docs.expo.dev/modules/overview).

### Zeego 3 — elegant API, wrong tested matrix for this app

Zeego offers a good composable cross-platform abstraction and native context menus, but its current compatibility table tests React Native 0.76/0.77 and pins `@react-native-menu/menu@1.2.2`, `react-native-ios-context-menu@3.1.0`, and `react-native-ios-utilities@5.1.2`. Nosh is on RN 0.81.5, and the older iOS peer version had a confirmed Expo 54 build incompatibility that was fixed later in `react-native-ios-context-menu@3.2.x`.

Zeego should not be adopted until its own tested matrix and peer dependencies cover Nosh's runtime. Its API convenience does not offset adding three native dependencies outside their documented combination.

Sources: [Zeego compatibility and Expo setup](https://zeego.dev/start), [Zeego context menu](https://zeego.dev/components/context-menu), [`react-native-ios-context-menu` Expo 54 report](https://github.com/dominicstop/react-native-ios-context-menu/issues/136).

### Nosh-owned Expo Module — fallback, not first move

Expo states that modules written with the Expo Modules API support the New Architecture by default. A small iOS module could therefore wrap UIKit directly if maintained packages fail the device gate. This gives Nosh control over tap menus, context previews, action identifiers, and dismissal behavior while retaining the real Apple surface. The tradeoff is long-term native maintenance, so it is justified only after the narrow package pilot fails.

Sources: [Expo Modules API overview](https://docs.expo.dev/modules/overview), [Expo third-party library and development-build guidance](https://docs.expo.dev/workflow/using-libraries/), [Expo New Architecture guidance](https://docs.expo.dev/guides/new-architecture/).

## Acceptance gate before broad adoption

The pilot should prove all of these in the real iOS development build:

- iOS 18 and the current iOS release: tap menu, long-press menu, dismissal, rotation, dark mode, Dynamic Type, and VoiceOver.
- Shelf scroll/recycling: no layout shift, detached menu anchor, accidental navigation, or stale action target.
- Reader gesture arbitration: no context menu during a page curl and no blocked page turn after dismissal.
- Exact action targeting after rapid scroll or page change.
- Delete is red and last, but never executes until a separate confirmation is accepted.
- The visible menu and long-press menu execute the same command handlers and analytics events.
- `npx expo-doctor@latest`, iOS native build, TypeScript, lint, and tests all pass.

The implementation decision should be based on this pilot, not on how the menu looks in the web server. Native menu integration is part of the app binary and requires rebuilding the development client.
