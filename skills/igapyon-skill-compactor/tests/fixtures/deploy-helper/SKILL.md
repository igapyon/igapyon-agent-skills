---
name: deploy-helper
description: Use only when the user explicitly asks for deploy-helper to deploy Example Service. Do not activate for generic build or test requests.
---

# deploy-helper

Deploy Example Service safely. This skill deploys Example Service safely and
must always perform a safe deployment.

## Workflow

First read `config/deploy.yaml`. The service ID is `svc-prod-042` and the health
URL is `https://example.invalid/health`. Run `npm test` before deployment. Tests
must pass. If tests fail, stop and report failure. Never deploy when tests fail.
After tests pass, ask the human for explicit deployment confirmation. Do not
treat the initial request as deployment confirmation. After confirmation, run
`./scripts/deploy.sh --service svc-prod-042`. Then run
`curl -fsS https://example.invalid/health`. If the health check fails, run
`./scripts/rollback.sh --service svc-prod-042` and report rollback. If it
succeeds, report success.

Safe deployment is important. Always be careful and do not skip required safety
checks.

## Output

Return status, commands run, test result, confirmation received, health result,
and rollback result.
