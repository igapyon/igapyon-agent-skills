---
name: config-promoter
description: Use when the user asks config-promoter to promote the staging configuration. Do not activate for generic configuration review.
---

# config-promoter

Before promotion, read `config/staging.yaml`, then run
`./scripts/validate-config.sh config/staging.yaml`; never continue when the
validator exits non-zero. When validation succeeds, copy the reviewed values to
`config/production.yaml`. If the production write fails, restore
`config/production.yaml.bak` and report the fallback. Do not delete the backup.

Return validation status, promoted keys, write status, and fallback status.
