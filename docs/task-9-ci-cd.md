# Task 9

## CI/CD

This project uses a GitHub Actions CI/CD pipeline with separate stages for PR validation, image build, stage deployment, and production deployment.

## `pr-checks.yml`

- Trigger: pull requests to `develop` and `main`
- Steps: `npm ci`, `npm run lint`, `npm run test`
- Additional quality gates: `docker build --check .` and `npm run test:e2e`
- Purpose: block merges when required checks fail

## `build-and-stage.yml`

- Trigger: push to `develop`
- Build job:
  - builds the production Docker image with target `prod`
  - pushes the image to GHCR as `ghcr.io/<owner>/<repo>/api:sha-<commit_sha>`
  - uses an immutable tag based on the Git commit SHA
  - generates `release-manifest.json` with the commit SHA, image name, and pushed image digest
- Stage deploy job:
  - runs on a self-hosted runner labeled `stage`
  - uses the GitHub `stage` Environment
  - pulls the exact image built in the previous job from GHCR
  - deploys it with `docker compose -f compose.prod.yml -p stage up -d`
  - performs a post-deploy smoke check against `http://localhost:${API_PORT}/api/health`

## `deploy-prod.yml`

- Trigger: manual `workflow_dispatch`
- Input: `image` value taken from `release-manifest.json`
- Runs on a self-hosted runner labeled `production`
- Uses the GitHub `production` Environment with manual approval / reviewers configured in GitHub
- Pulls and deploys the exact same Docker image that was built earlier, so production does not rebuild the artifact
- Uses `concurrency: production` to prevent parallel production deployments
- Deploys with `docker compose -f compose.prod.yml -p prod up -d`
- Verifies the deployment with the same `/health` smoke check

## Release Artifact

- Registry: GitHub Container Registry (`ghcr.io`)
- Artifact format: immutable Docker image tag `sha-<commit_sha>`
- Manifest: `release-manifest.json`
- Stored metadata:
  - commit SHA
  - service name (`api`)
  - image reference
  - image digest

Production deployment uses the previously built image from the manifest. It does not rebuild the application.

## Deployment Model

- Deploy target: Oracle Cloud VM with Docker Compose
- Reverse proxy: Caddy
- Stage and production are separated by different GitHub Environments and different Compose project names: `stage` and `prod`
- Runtime definition: [`compose.prod.yml`](../compose.prod.yml)
- Health-check action: [`.github/actions/wait-for-health/action.yml`](../.github/actions/wait-for-health/action.yml)

## End-to-End Flow

1. Open a PR into `develop` or `main` to run lint, unit tests, Docker build validation, and e2e tests.
2. Merge to `develop` to build and push the production image, create the release manifest, and automatically deploy to `stage`.
3. Take the image value from `release-manifest.json` and start `deploy-prod.yml`.
4. After manual approval in the `production` Environment, deploy the same image to production and verify `/health`.
