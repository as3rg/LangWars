# Release images and Portainer

The root Compose files build from a checkout. This directory supplies a pull-only
stack for **Portainer with a Docker Standalone environment**, using a host nginx
for HTTPS. It has no build steps or host file mounts and can be pasted directly
into Portainer's stack editor. Keep the existing Compose/Caddy files for development
or deployments that build locally.

## Publish a release

Merge/push these workflow changes to the default branch, then publish a GitHub release from a commit containing
them. Draft releases do not publish images. The workflow runs the same server,
PostgreSQL, frontend and Compose checks as normal CI before publishing.

For repository `OWNER/REPOSITORY`, image names are automatically lowercased:

| Image | Used by |
| --- | --- |
| `ghcr.io/owner/repository-server:TAG` | API and workers |
| `ghcr.io/owner/repository-web:TAG` | Frontend and internal nginx |
| `ghcr.io/owner/repository-ingress:TAG` | Optional Caddy ingress image |

Each image contains Linux amd64 and arm64 variants, version/source labels, build
provenance and an SBOM. `TAG` is the release tag, for example `v1.2.3`; the workflow
also publishes a full `sha-...` commit tag and records digests in its job summary.
Use Docker-compatible release tags: letters, digits, underscores, dots and dashes,
at most 128 characters, starting with a letter, digit or underscore.
The names `latest` and `sha-*` are reserved for workflow-generated tags.

Stable releases update `latest` only after all three images publish successfully
and only when GitHub identifies that release as the current latest release.
Prereleases get their version/commit tags without moving `latest`. Portainer
requires an explicit version tag so an update remains an operator decision.

Publishing uses GitHub's built-in `GITHUB_TOKEN` with `packages:write`; no Docker Hub
secret is required. Repository/organization package policy must permit publishing.
If a package with the chosen name already exists, grant this repository Actions
access to that package. See [GitHub's publishing guide](https://docs.github.com/en/actions/tutorials/publish-packages/publish-docker-images).

GHCR packages can remain private. Add `ghcr.io` as a registry in Portainer using a
GitHub credential with `read:packages` access, or explicitly make the packages
public in GitHub package settings if anonymous pulls are intended. Select the
matching registry when deploying; see [Portainer stack setup](https://docs.portainer.io/user/docker/stacks/add).

## Deploy the stack

Create a Docker Standalone stack in Portainer and paste [compose.yaml](compose.yaml).
Set the following through the stack's environment-variable editor or import a
filled-in copy of [stack.env.example](stack.env.example):

| Variable | Value |
| --- | --- |
| `LANGWARS_IMAGE_PREFIX` | Replace `ghcr.io/your-owner/your-repository` with the published lowercase prefix |
| `LANGWARS_IMAGE_TAG` | One published release tag shared by API, workers and web |
| `POSTGRES_PASSWORD` | A long random URL-safe password |
| `BOOTSTRAP_ADMIN_PASSWORD` | A separate random password, at least 12 characters |
| `BOOTSTRAP_ADMIN_USERNAME` | Optional; defaults to `admin` |
| `HTTP_PORT` | Optional; defaults to loopback port `8080` |
| `WORKER_REPLICAS` | Optional; defaults to two workers |

Deploy with image pulls enabled. The stack starts PostgreSQL, the API, workers and
web, and preserves its PostgreSQL named volume across stack updates. No API or
database host ports are published. Bootstrap credentials create the initial admin;
changing them does not reset an existing account's password.

The stack uses bridge subnet `172.30.251.0/24` with gateway `172.30.251.1`. The web
image trusts only this gateway for the host nginx's forwarded client address.
If it conflicts with another Docker/VPN network, change `LANGWARS_NETWORK_SUBNET`
and `LANGWARS_NETWORK_GATEWAY` together. Incoming forwarded headers are overwritten
by the host nginx example so clients cannot choose their own rate-limit identity.

For an upgrade, change `LANGWARS_IMAGE_TAG` and redeploy with fresh image pulls.
Keep all components on the same release. A digest from the workflow summary can
be used for stricter image pinning by editing individual `image:` references.
Database contents survive updates; back up before releases with schema changes.
For automatic incremental backups and a full backup every N days, see the
[Portainer backup setup and recovery guide](../../docs/Backups.md#portainer).
Switching from a separately named Compose project does not automatically attach
its old database volume—explicitly configure an existing external volume if that
data should be retained, and never run two PostgreSQL servers against one volume.

## Host nginx

Install [the example config](../nginx.conf.d/langwars.conf.example) as
`/etc/nginx/conf.d/langwars.conf` on the **same host as this Docker stack**. Replace
the example domain, upstream port if changed, and paths to already-issued TLS
certificates. Validate with `nginx -t`, then reload nginx. The port `8080` stays
bound to loopback; only nginx exposes the domain on ports 80/443.

The example forwards `/` and `/api/` without rewriting paths, supports ACME webroot
challenges, redirects HTTP to HTTPS, and passes the real client address. Keep nginx
as the public edge, or configure explicit trusted upstream proxies before placing
a CDN/proxy in front. Do not copy incoming `X-Forwarded-For` values blindly.

If nginx itself runs in a container, `127.0.0.1` inside it is that container, so use
a shared ingress network and point it to `web:8080` instead. Set the web image's
`TRUSTED_PROXY_CIDRS` to that proxy container's exact address. The provided stack
is configured for host nginx, and its API/database should stay on a private network.

The ingress image is published for users who prefer Caddy, but is intentionally
absent from this nginx-fronted stack so two services do not compete for HTTPS ports.
