# Architecture decisions

Brand: وهومن / VAHUMAN (technical: `vahuman`). Admin title: مدیریت وهومن.

## Pricing (Phase 2)

Canonical monetary unit in PostgreSQL: **integer Iranian toman**.
Never store floats. Compare-at prices are optional integers in the same unit.

## Product ↔ Category

Many-to-many via `product_categories`, with at most one primary category per product
(partial unique index). Chosen for general-purpose catalog flexibility without forcing
a single-category model.

## Variants

`product_variants.combination_key` is a deterministic sorted join of attribute value IDs.
Duplicate combinations are blocked by a unique index on `(product_id, combination_key)`.

## Media

`product_media` stores URL / storage key / metadata only. No binaries in Postgres.

## Auth

Better Auth + roles `admin` | `customer`. All catalog mutations require `requireAdminSession()`.

## Background jobs / storage

Importer crawling and image pipelines must not run unbounded inside serverless requests.
Object storage provider remains configurable for a later phase.
