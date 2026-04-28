# Fastlane store-listing metadata

This directory follows the [Fastlane supply / Triple-T metadata schema](https://github.com/Triple-T/gradle-play-publisher#managing-play-store-metadata)
which is consumed by **both** the Google Play upload action
(`r0adkll/upload-google-play@v1`) and the F-Droid build server.

## Layout

```
fastlane/metadata/android/en-US/
├── title.txt                # ≤30 chars — store title
├── short_description.txt    # ≤80 chars — Play short description / F-Droid Summary
├── full_description.txt     # ≤4000 chars — store description
├── changelogs/
│   └── <versionCode>.txt    # ≤500 chars — "what's new" for that build
└── images/
    ├── icon.png             # 512×512 launcher icon (PNG, no alpha)
    ├── featureGraphic.png   # 1024×500 Play feature graphic
    └── phoneScreenshots/
        ├── 1.png            # ≥320×320, ≤3840×3840
        └── 2.png            # at least two phone screenshots required by Play
```

## Required artwork (must be added before first store submission)

The text files above are committed but the binary artwork is **not** —
add the following files locally before invoking the Play release
workflow or submitting to F-Droid:

* `images/icon.png` — 512×512 PNG, no alpha, matches `android/app/src/main/res/mipmap-*/ic_launcher.png`
* `images/featureGraphic.png` — 1024×500 PNG (Play store header)
* `images/phoneScreenshots/1.png` … `8.png` — at least two, max eight,
  taken from the running app on a phone-sized device

F-Droid additionally accepts `images/sevenInchScreenshots/`,
`images/tenInchScreenshots/`, `images/tvScreenshots/`, and
`images/wearScreenshots/` if you want to target those form factors.

## Per-release changelog

`release-bump.yml` writes a new file at
`changelogs/<new-versionCode>.txt` so that every released build has a
matching "what's new" entry. Keep it under 500 characters — Play and
F-Droid both reject longer entries.

## Adding more locales

Copy the entire `en-US/` directory to a new locale code (e.g.
`de-DE/`, `fr-FR/`) and translate the `.txt` files. Both Play and
F-Droid automatically pick up additional locales.
