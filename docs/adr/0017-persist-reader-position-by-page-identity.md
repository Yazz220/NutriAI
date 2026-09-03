# ADR 0017: Persist Reader Position By Page Identity

Status: Accepted

Date: 2026-09-03

## Context

The cookbook reader kept its page only while one component instance remained mounted. Returning from the shelf or restarting the app defaulted to the first spread. Cached pages could also arrive after the entry animation started, producing a visible jump from the opening spread to a requested page. Closing the physical cover reset the spread index even though the user had not chosen to lose their place.

## Decision

- Store one device-local, user-scoped reading position per cookbook in AsyncStorage, including whether the reader was in one-page or two-page view.
- Persist the stable recipe-page ID as the canonical position and its numeric index only as a deletion fallback.
- Restore the position before starting the reader entry animation. Keep the cover stable while page cache and position state hydrate.
- Treat an explicit route `pageId` as intentional navigation that overrides the saved position for that visit.
- Restore the saved view mode on ordinary shelf entry and app restart. An explicit page route opens that page in one-page view, while older saved records without a mode retain the compatible one-page default.
- Record only pages that become visible through reading or page-overview navigation. Do not persist overview, menus, sheets, or other transient presentation state.
- Preserve the current spread when the physical cover closes and reopens.
- Serialize position writes per user, clear one position when its cookbook is deleted, and clear all positions when the account is deleted.

## Consequences

Normal shelf navigation and app restarts resume at the reader's last visible recipe in the same one-page or two-page presentation, without first rendering a different spread. Reordering keeps the same recipe in focus because identity wins over index. Removing the active page resumes near its former location instead of resetting the book. Reader history remains device-local and does not add database traffic, schema, synchronization, or privacy-sensitive server state.
