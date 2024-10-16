# Changelog

All notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

## [2.0.2](https://github.com/esroyo/opentelemetry-server-timing-span-exporter/compare/v2.0.1...v2.0.2) (2024-10-16)

## [2.0.1](https://github.com/esroyo/opentelemetry-server-timing-span-exporter/compare/v2.0.0...v2.0.1) (2024-10-16)


### Bug Fixes

* use regular ">" as default breadcrumb glue ([33cf381](https://github.com/esroyo/opentelemetry-server-timing-span-exporter/commit/33cf38171fdf85d672f9fcac1d71dea1fe7222ba))

## [2.0.0](https://github.com/esroyo/opentelemetry-server-timing-span-exporter/compare/v1.2.0...v2.0.0) (2024-10-16)


### ⚠ BREAKING CHANGES

* include parent names by default in each exported span

### Features

* include parent names by default in each exported span ([63290b3](https://github.com/esroyo/opentelemetry-server-timing-span-exporter/commit/63290b3cba1e4a367b8e945f75d875f0c835017b))

## [1.2.0](https://github.com/esroyo/opentelemetry-server-timing-span-exporter/compare/v1.1.2...v1.2.0) (2024-05-23)


### Features

* add "precision" optional param to getServerTimingHeader ([2edac7c](https://github.com/esroyo/opentelemetry-server-timing-span-exporter/commit/2edac7ca3a0821c9657414512943a38f333063c1))

## [1.1.2](https://github.com/esroyo/opentelemetry-server-timing-span-exporter/compare/v1.1.1...v1.1.2) (2024-05-08)

## [1.1.1](https://github.com/esroyo/opentelemetry-server-timing-span-exporter/compare/v1.1.0...v1.1.1) (2024-05-08)

## 1.1.0 (2024-05-08)


### Features

* first version ([f754dc8](https://github.com/esroyo/opentelemetry-server-timing-span-exporter/commit/f754dc8588fee3e8824c470fe82cda730e0072b1))


### Bug Fixes

* make sure spans and events are sorted by endTime ([2cb566a](https://github.com/esroyo/opentelemetry-server-timing-span-exporter/commit/2cb566ad07832e58c3a83c38450efb6182dd6439))


### Other

* rename package from `otlp` to `otel` ([9c20dbb](https://github.com/esroyo/opentelemetry-server-timing-span-exporter/commit/9c20dbb00c1c77a16bd4d40573d1137d4a3a8899))
