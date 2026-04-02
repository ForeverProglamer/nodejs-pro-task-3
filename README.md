# E-commerce Platform

## Quick start

Requirements:
- Node.js (v24.13.0)
- npm
- Docker & Docker Compose

```bash
cp .env.example .env
npm ci # Install deps on your local machine for IDE support
npm run compose:up # Start app and infra
npm run compose:ps # Ensure everything is running

# Later, when you are done...
npm run compose:down # Shut down app and infra
```

Accessing services:
- API: http://localhost:3000
- Postgres: http://localhost:5432
- RabbitMQ: http://localhost:5672
- RabbitMQ Web UI: http://localhost:15672

> NOTE: See `.env.example` / `.env` for service credentials.

Available one-off jobs:
- Migrate DB: `docker compose run --rm migrate`
- Seed DB: `docker compose --profile seed run --rm seed`

## Bruno API Collection

`./api-collection` contains a couple of endpoints for API testing 
that you can import.

## CI/CD (Task 9)
This project uses a GitHub Actions CI/CD pipeline with separate stages for PR validation, image build, stage deployment, and production deployment.

`pr-checks.yml`
- Trigger: pull requests to `develop` and `main`
- Steps: `npm ci`, `npm run lint`, `npm run test`
- Additional quality gate: `docker build --check .`
- Purpose: block merges when required checks fail

`build-and-stage.yml`
- Trigger: push to `develop` and currently also `feature/**` for testing
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
  - performs a post-deploy smoke check against `http://localhost:${API_PORT}/health`

`deploy-prod.yml`
- Trigger: manual `workflow_dispatch`
- Input: `image` value taken from `release-manifest.json`
- Runs on a self-hosted runner labeled `production`
- Uses the GitHub `production` Environment with manual approval / reviewers configured in GitHub
- Pulls and deploys the exact same Docker image that was built earlier, so production does not rebuild the artifact
- Uses `concurrency: production` to prevent parallel production deployments
- Deploys with `docker compose -f compose.prod.yml -p prod up -d`
- Verifies the deployment with the same `/health` smoke check

Release artifact
- Registry: GitHub Container Registry (`ghcr.io`)
- Artifact format: immutable Docker image tag `sha-<commit_sha>`
- Manifest: `release-manifest.json`
- Stored metadata:
  - commit SHA
  - service name (`api`)
  - image reference
  - image digest

Deployment model
- Deploy target: remote/self-hosted runners with Docker Compose
- Stage and production are separated by different GitHub Environments and different Compose project names: `stage` and `prod`
- Runtime definition: [`compose.prod.yml`](./compose.prod.yml)
- Health-check action: [`.github/actions/wait-for-health/action.yml`](./.github/actions/wait-for-health/action.yml)

End-to-end flow
1. Open a PR into `develop` or `main` to run lint, unit tests, and Docker build validation.
2. Merge to `develop` to build and push the production image, create the release manifest, and automatically deploy to `stage`.
3. Take the image value from `release-manifest.json` and start `deploy-prod.yml`.
4. After manual approval in the `production` Environment, deploy the same image to production and verify `/health`.
