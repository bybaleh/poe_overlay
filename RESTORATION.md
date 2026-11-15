# XenonTrade restoration status
Original upstream: https://github.com/klayveR/xenontrade (MIT license).

## Target
Manjaro / Arch Linux using **X11** (confirmed by the user). Intended for **Path of Exile 1**.

## Imported
Original upstream source, graphical assets, templates, and package manifest. The old README is retained as `readme.md`.

## Preliminary changes
- Replaced `poe-ninja-api-manager` import with local `src/modules/ninja-modern.js`.
- New experimental PoE 1 economy data adapter with in-memory cache, bounded concurrency, and category-level error handling.
- League lookup switched to HTTPS poe.ninja and old default `Delve` changed to `Standard`.
- Parser no longer removes the final clipboard line when the warning is absent.
- Missing-price errors are displayed instead of silently flashing an icon.
- Added mocked API tests (`node tests/adapter.test.js`).

## NOT done / not verified
- **Not a tested release.** No successful startup on Manjaro, in-game interaction, or end-to-end HTTP response verification is claimed.
- Legacy Electron 2.0.10, `iohook`, `ffi`, `active-win`, `electron.remote`, `electron-window-manager` and app packaging remain to be migrated.
- Old item template labels Exalted Orb, while current currency economy uses Divine Orb. Values/labels should be updated as a coordinated change.
- Exchange API response schemas, value units and category support must be verified against live responses; do not rely on prices until then.
- Modern item clipboard formats and unique variants need tests against actual in-game examples.
- `poeprices.info` rare-item predictor has not been verified or migrated.
- Security hardening: migrate away from deprecated renderer Node integration and Electron 2 before distributing.
- Remove obsolete dependency `poe-ninja-api-manager` after updating package and lockfile as part of coordinated Electron upgrade.

## Current test
```sh
node tests/adapter.test.js
```

## License
Original copyright remains with upstream authors under MIT; see `LICENSE`.
