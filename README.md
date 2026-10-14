# TDSE Secure Web System
## Mariana Malagón

Enterprise risk control workshop: a small web system that demonstrates identity
management, authorization, and encryption in transit as security controls.

## Overview

- **Frontend**: React (Vite) single-page application, authenticates users via Auth0.
- **Backend**: Spring Boot API, acting as an OAuth 2.0 Resource Server that validates
  JWT access tokens issued by Auth0.
- **Deployment**: Ubuntu server (AWS EC2), Apache HTTP Server as reverse proxy and TLS
  terminator, public hostname via Duck DNS, certificate issued by Let's Encrypt.

The backend exposes a single protected endpoint, `GET /api/risk-status`. The frontend
logs the user in through Auth0, obtains an access token, and calls the endpoint with
`Authorization: Bearer <token>`.

## Architecture

### Authentication and request flow

```
Browser
   |
   | 1. Login redirect
   v
 Auth0 ------------------------------> React frontend
   |                                        |
   | 2. Access token (JWT)                  |
   <----------------------------------------+
                                             |
                                             | 3. GET /api/risk-status
                                             |    Authorization: Bearer <token>
                                             v
                                      Spring Boot API
                                (validates issuer + audience)
```

### Deployment layout

```
                    +------------------------------------------------+
                    |                  EC2 instance                   |
                    |                                                  |
                    |   +----------+   +----------+   +----------+     |
  User              |   |  Apache  |   |  React   |   |  Spring  |     |
   |                |   | (reverse |   |    FE    |   |    BE    |     |
   |  HTTPS         |   |  proxy)  |   | (static  |   | (:8080,  |     |
   +--------------->|   +----+-----+   |  build)  |   |  local   |     |
                    |        |         +----------+   |  only)   |     |
                    |        v                         +----------+     |
                    |   +----------+                                   |
                    |   | TLS cert |                                   |
                    |   | (Let's   |                                   |
                    |   | Encrypt) |                                   |
                    |   +----------+                                   |
                    +------------------------------------------------+
                             ^
                             |
                        Duck DNS
                (subdomain resolves to the EC2 public IP)
```

- Apache terminates TLS and reverse-proxies `/api/*` to the Spring Boot process.
- The Spring Boot process listens only on `127.0.0.1:8080`; it is never reachable
  from the public internet, only through Apache.
- Apache also serves the React production build (`dist/`) as static files.
- Both the React frontend and the Spring Boot API trust the same Auth0 tenant: the
  frontend for login and token retrieval, the backend for validating the token's
  issuer and audience.

## Deployed URL

_Pending deployment (Part 6)._

## Progress

- [x] Part 0 — Repository skeleton
- [x] Part 1 — Auth0 tenant, SPA application, API
- [x] Part 2 — Spring Boot backend (local)
- [x] Part 3 — React frontend (local)
- [ ] Part 4 — Server preparation and Duck DNS
- [ ] Part 5 — Backend deployment (systemd)
- [ ] Part 6 — Apache and HTTPS
- [ ] Part 7 — Verification and evidence

## Auth0 configuration

Two resources were created in the Auth0 tenant. None of the values below are
secrets: the domain, client ID, and audience are meant to be embedded in a
browser application. The client secret (if shown by Auth0) is never used, since
this is a Single-Page Application.

| Resource | Name | Value |
|---|---|---|
| Application (SPA) | `Enterprise Risk Lab Frontend` | Domain: `dev-eeuv3wthjtjchg5x.us.auth0.com` |
| Application (SPA) | `Enterprise Risk Lab Frontend` | Client ID: `TKskNNIdaipO1ISxzbQf1sobegMoAJTW` |
| API | `Enterprise Risk Lab API` | Identifier (audience): `https://enterprise-risk-api` |
| API | `Enterprise Risk Lab API` | Signing algorithm: `RS256` |
| API Permission | `read:risk` | Read the protected risk status |

Allowed Callback/Logout/Web Origin URLs for the SPA are currently set to
`http://localhost:5173` for local development. They will be extended with the
production Duck DNS URL in Part 6.

`Enterprise Risk Lab Frontend` was granted **User-Delegated Access** (not Client
Access, which is for machine-to-machine applications and would not authorize a
browser login) to `Enterprise Risk Lab API`, with the `read:risk` permission
selected. Without this authorization, the login flow fails with
`invalid_request: Client "..." is not authorized to access resource server "..."`.

**Evidence**

SPA `Enterprise Risk Lab Frontend` created:

![SPA Enterprise Risk Lab Frontend created](docs/images/01-auth0-spa-created.png)

API `Enterprise Risk Lab API` created:

![API Enterprise Risk Lab API created](docs/images/02-auth0-api-created.png)

API general settings (identifier):

![API general settings showing the identifier](docs/images/03-auth0-api-general-settings.png)

API token settings (RS256, JWE disabled):

![API token settings showing RS256 signing algorithm](docs/images/04-auth0-api-token-settings.png)

`Enterprise Risk Lab Frontend` granted user-delegated access to the API:

![Application Access tab showing the frontend granted access](docs/images/05-auth0-application-access-granted.png)

`read:risk` permission defined on the API and granted to the frontend:

![read:risk permission granted under User-Delegated Access](docs/images/10-auth0-read-risk-permission-granted.png)

## Backend (local)

Generated with Spring Initializr (Java 21, Maven, Spring Boot 4.1.1) with the Web,
Security, OAuth2 Resource Server, and Actuator starters.

- `SecurityConfig.java`: defines the security filter chain. `/actuator/health` is
  public, `/api/**` requires a valid JWT, everything else is denied by default. CORS
  is restricted to the frontend's dev and production origins.
- `RiskController.java`: exposes `GET /api/risk-status`, the single protected
  endpoint, returning the authenticated user's subject claim.
- `application.properties`: configures the resource server with the Auth0
  `issuer-uri` and `audiences`, so Spring Security both verifies the JWT signature
  (via Auth0's published JWKS) and rejects tokens issued for a different API.

Note: the workshop instructions list only Web, Security, and OAuth2 Resource Server
as dependencies, but reference `/actuator/health` for the local check and later for
the production health check (Part 5). The Actuator starter was added for that
endpoint to exist.

Verified locally:

```
$ curl -i http://localhost:8080/api/risk-status
HTTP/1.1 401

$ curl -i http://localhost:8080/actuator/health
HTTP/1.1 200
{"groups":["liveness","readiness"],"status":"UP"}
```

## Frontend (local)

Built with Vite (React template) and `@auth0/auth0-react`.

- `main.jsx`: wraps the app in `Auth0Provider`, configured from `.env.local`
  (`domain`, `clientId`, `audience` — none of these are secrets for a SPA).
- `App.jsx`: shows a login button when signed out; once signed in, it reads the
  access token with `getAccessTokenSilently()` and calls `GET /api/risk-status`
  with `Authorization: Bearer <token>`. The call is wrapped in `try/catch` and
  checks `response.ok` before parsing the body, so a rejected or expired token
  shows the real HTTP status instead of an unhandled error.

**Deliverable — successful authenticated API call**

Initial state, signed out:

![Frontend initial state, signed out](docs/images/06-frontend-initial-state.png)

Auth0 Universal Login screen:

![Auth0 login screen](docs/images/07-frontend-login-screen.png)

Signed in:

![Signed in to the frontend](docs/images/08-frontend-logged-in.png)

Successful authenticated call to the protected API:

![Successful authenticated call to the protected API](docs/images/09-frontend-authenticated-api-call.png)

## Repository structure

```
frontend/     React application (added in Part 3)
backend/      Spring Boot application (added in Part 2)
docs/images/  Evidence screenshots gathered throughout the workshop
```
