# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.15.8] - 2026-02-07

- Update dependencies
- Optimize PDF module usage for faster load

## [2.15.7] - 2026-01-07

- Updated dependencies
- Fixed video export on pages with different sizes

## [2.15.3] - 2026-01-07

- Fixed default audio encoding in video export

## [2.15.2] - 2025-12-31

- Video rendering optimizations

## [2.15.1] - 2025-12-29

- Fixed incorrect video export on some sizes

## [2.15.0] - 2025-12-25

- Update polotno internals
- Download assets on video export

## [2.14.10] - 2025-12-23

- Better error handling

## [2.14.8] - 2025-12-19

- Video render improvements

## [2.14.3] - 2025-12-18

- Dramatically improve video render performance

## [2.14.0] - 2025-12-17

- Support for video export

## [2.13.1] - 2025-12-11

- update dependencies, depricate htmlTextRenderEnabled in favor of richTextEnabled

## [2.12.30] - 2025-10-20

- Added `args` export, optimize args passed into the browser
- Remove `--disable-font-subpixel-positioning` from default args

## [2.12.29] - 2025-10-14

- Use fixed version for puppeteer

## [2.12.27] - 2025-10-07

- improved render stability, update polotno

## [2.12.26] - 2025-10-06

- Fixed passing of `fontLoadTimeout` argument
- Update polotno

## [2.12.25] - 2025-09-24

- Update polotno with fixes for some font family names

## [2.12.24] - 2025-09-23

- Updated polotno with rich text render fixess

## [2.12.23] - 2025-09-20

- Updated polotno with curved text support

## [2.12.22] - 2025-08-28

- Improved rich text render when setTextSplitAllowed is used

## [2.12.21] - 2025-08-26

- Update polotno, improve text render stability

## [2.12.19] - 2025-07-25

- Update polotno to version `2.25.9`
- Typescript fixes

## [2.12.17] - 2025-07-07

- Update polotno to version `2.25.2`
- Update internal dependencies

## [2.12.16] - 2025-06-19

- Update polotno to version `2.24.0`.

## [2.12.12] - 2025-06-10

- Remove wrong logs

## [2.12.11] - 2025-06-10

- Better error logs

## [2.12.10] - 2025-06-10

- Update polotno to version `2.23.12`.

## [2.12.9] - 2025-06-05

- Update polotno to version `2.23.11`.

## [2.12.8] - 2025-06-05

- Update polotno to version `2.23.10`.

## [2.12.7] - 2025-06-03

- Update polotno to version `2.23.9`.

## [2.12.6] - 2025-05-27

- Update polotno to version `2.23.7`.

## [2.12.5] - 2025-05-27

- Update polotno to version `2.23.6`.

## [2.12.4] - 2025-05-19

- Update polotno to version `2.23.4`.

## [2.12.3] - 2025-05-13

- Update polotno to version `2.23.3`.

## [2.12.2] - 2025-05-12

- Update polotno to version `2.23.2`.

## [2.12.1] - 2025-05-08

- Update polotno to version `2.23.1`

## [2.12.0] - 2025-04-21

- New `requestInterceptor` options for instance
- Update polotno to version 2.22.1

## [2.11.11] - 2025-04-17

- Update polotno to version 2.21.11

## [2.11.10] - 2025-04-03

- Embed `jsPDF` to prevent cdn downtime
- Typescript types

## [2.11.6] - 2025-03-07

- Update dependencies
- Change userAgent, so it fixes some font rendering (yes, you read that right)

## [2.11.5] - 2025-02-05

- Update polotno to 2.19.2

## [2.11.4] - 2025-01-28

- Update polotno to 2.19.1

## [2.11.3] - 2025-01-27

- Update polotno to 2.18.0
- Update other dependencies

## [2.11.1] - 2024-12-16

- Update polotno to 2.16.2

## [2.11.0] - 2024-12-03

- Update polotno to 2.16.0
- `textSplitAllowed` option

## [2.10.9] - 2024-11-26

- Update polotno to 2.15.0

## [2.10.8] - 2024-11-21

- Update polotno to 2.14.11

## [2.10.6] - 2024-11-12

- Update polotno to 2.14.9
- Update dependencies

## [2.10.5] - 2024-09-23

- Update polotno to 2.14.0

## [2.10.4] - 2024-09-17

- Update polotno to 2.13.9
- Better error messages

## [2.10.3] - 2024-09-04

- Update dependencies
- Polotno update to 2.13.0

## [2.10.1] - 2024-08-19

- Close instance on process exit
- Update dependencies
- Clean some files. `video.js` is removed.

## [2.10.0] - 2024-08-19

- Audio over video

## [2.9.39] - 2024-08-18

- Fix audio export again

## [2.9.38] - 2024-08-17

- Fix audio export

## [2.9.36] - 2024-08-11

- Update polotno to 2.11.4

## [2.9.34] - 2024-08-08

- Update polotno to 2.11.1

## [2.9.33] - 2024-08-02

- Faster webm conversion

## [2.9.31] - 2024-08-01

- Fix video quality on webm conversion

## [2.9.30] - 2024-07-22

- Update polotno to 2.10.11

## [2.9.30] - 2024-07-16

- Update polotno to 2.10.0
- Add `skipImageError` option

## [2.9.29] - 2024-07-05

- Update polotno to 2.9.15

## [2.9.27] - 2024-07-05

- Update dependencies

## [2.9.26] - 2024-06-12

- Fix audio in video render
- Improve video render performance
- Fix some video render flicks
- Update polotno to 2.9.2

## [2.9.25] - 2024-06-05

- Upgrade polotno to 2.8.3
- Better defaults for video rendering

## [2.9.24] - 2024-05-27

- Upgrade polotno to 2.7.0

## [2.9.23] - 2024-05-24

- Upgrade polotno to 2.6.5

## [2.9.17] - 2024-05-13

- Fix video export crash on some aspect ratios

## [2.9.16] - 2024-05-13

- use jpeg for images in video export

## [2.9.14] - 2024-05-09

- Speed up video render process

## [2.9.13] - 2024-05-08

- More information in progress

## [2.9.12] - 2024-05-07

- `onProgress` option for video export

## [2.9.11] - 2024-05-07

- Add `--disable-gpu` flag to the default browser options. It should drastically improve performance
- Audio support for video export

## [2.9.10] - 2024-04-29

- Remove `--use-gl=swiftshader'` from the default browser options. It should crashes

## [2.9.8] - 2024-04-25

- `attrs.fontLoadTimeout` option for better control of font loading
- Some warnings on missing functions in the client

## [2.9.6] - 2024-04-24

- Update puppeteer to 20.7.0

## [2.9.5] - 2024-04-16

- Fix export of images with filters

## [2.9.4] - 2024-04-16

- Update Polotno client to 2.4.25. It should fix export of design with very very small images
- Update dependencies
- Fix stack on Mac

## [2.9.3] - 2024-04-04

- Update Polotno client to 2.4.23
- Added browser's options for better font rendering
- Update other internal dependencies

## [2.9.2] - 2024-02-09

- Export fixes, update dependencies

## [2.9.0] - 2024-01-25

- New option `attrs.textOverflow`

## [2.8.1] - 2024-01-22

- Dependencies update

## [2.8.0] - 2024-01-02

- Update polotno client
- Faster video export
- Dependencies update

## [2.7.3] - 2023-11-27

- Video export updates
- Polotno update
- Internal dependencies update

## [2.6.7] - 2023-10-19

- Fail on incorrect `useParallelPages: false` usage

## [2.6.6] - 2023-10-19

- Fix for `useParallelPages: false`

## [2.6.4] - 2023-10-13

- Text rendering fixes when font can't be loaded
- Smaller client bundle size, should improve performance

## [2.6.3] - 2023-10-05

- Video export fixes

## [2.6.2] - 2023-09-11

- Fix crash on windows

## [2.6.1] - 2023-08-28

- increase default `protocolTimeout` for browsers. Should fix some rendering issues.

## [2.6.0] - 2023-08-25

- `skipFontError` option on export

## [2.5.0] - 2023-08-15

- Experimental video export support

## [2.4.2] - 2023-08-05

- Update polotno client. Should fix rendering of text with background.

## [2.1.0] - 2023-05-30

- Replaced chrome-aws-lambda dependency with updated package for Node LTS support
