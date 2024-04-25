# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.9.7] - 2024-04-25

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
