# Changelog

All notable changes to this project. Follows [Semantic Versioning](https://semver.org/).
Versions before 1.12.2 were assigned retroactively from the commit history.

## [2.0.0] - 2026-10-27
### Fixed
- `POST /post/create` now validates its fields like `PATCH /post/{id}`: a title over 50 characters or an invalid image URL gets a 400 instead of a 500, and the title and text are trimmed.
- `POST /post/create` rejects a `community_id` that isn't a UUID (400).
- `POST /community/create` checks the description and banner URL like `PATCH /community/{id}`.
- `POST /user/create` checks the username and email like `PATCH /user/{id}`, and two sign-ups racing for the same name get a 409 instead of a 500.
- Post, community and user lists have a fixed order (posts newest first, the rest by name), so posts no longer drop out of the first 100 at random.
### Changed
- `POST /auth/login` and `POST /user/create` allow 20 attempts per IP per minute, then answer 429.
- The Docker build installs exactly what `pnpm-lock.yaml` pins.
- The smoke test runs on every push to main and every pull request.
### Removed
- **Breaking:** `GET /auth/verify` and `GET /auth/decode`. They took the token in the URL, where it ends up in logs, and the frontend doesn't use them.

## [1.13.0] - 2026-10-18
### Added
- `PATCH /user/{id}`: change your own username, email or password (the password needs `current_password`).
- `DELETE /user/{id}`: delete your own account, or any account as an admin. Deletes the user's posts and comments and takes their votes out of post scores.
- `PATCH /post/{id}` (author only) and `DELETE /post/{id}` (author or admin).
- `PATCH /comment/{comment_id}` (author only).
### Changed
- Admins can now delete anyone's comments.

## [1.12.2] - 2026-10-15
### Changed
- Project declared stable; version set to 1.12.2 (continues from 0.11.2).
- Swagger docs now read the API version from `package.json`.
- Replaced Sequelize with Drizzle ORM (#20).

## [0.11.1] - 2026-10-15
### Changed
- Scripts and README updated for pnpm (#17).
### Fixed
- Silenced dotenv warnings; stricter JWT typing in auth functions (#18).

## [0.11.0] - 2026-10-15
### Added
- Database migrations and initial schema setup (#16).

## [0.10.0] - 2026-10-12
### Added
- Community admins, community rules and community editing (#15).

## [0.9.0] - 2026-10-11
### Added
- Create, list and delete comments on posts (#14).
### Changed
- README updated with current tech stack (#13).

## [0.8.0] - 2026-10-05
### Added
- One vote per user per post (#12).

## [0.7.0] - 2026-10-04
### Added
- Password login (`POST /auth/login`) with scrypt-hashed passwords; JWTs expire after 7 days.
- `requireAuth` middleware protecting post and community write routes.
- Duplicate username/email checks on sign-up; end-to-end smoke test.
### Changed
- **Breaking:** `POST /auth?userId=` removed; write routes now require a Bearer token.
- Foreign keys declared inline with cascading deletes; Swagger docs completed (#11).

## [0.6.1] - 2026-10-04
### Fixed
- Parameterized inserts to prevent SQL injection (#10).
- Docker build: copy `pnpm-workspace.yaml` before install; ignore `.env.*` files.

## [0.6.0] - 2025-07-15
### Changed
- **Breaking:** Reworked post, user and community endpoints (#9).

## [0.5.1] - 2025-04-22
### Fixed
- Community creation route (#8) and community types.
- pnpm error during deployment.

## [0.5.0] - 2024-11-16
### Changed
- **Breaking:** `post_author` now references the username instead of `user_id`.
- `post_content` changed from `VARCHAR(255)` to `TEXT` (#7).

## [0.4.0] - 2024-11-10
### Added
- Post comments (#6).

## [0.3.0] - 2024-11-02
### Added
- JWT authentication (#5).

## [0.2.3] - 2024-10-26
### Added
- Fly.io deployment config (#4).
### Fixed
- Get-all-communities endpoint and Swagger rendering (#3).

## [0.2.2] - 2024-10-26
### Changed
- Switched from Bun to pnpm; sources moved into `src/` (#2).
### Fixed
- Build-breaking imports and env/Sequelize client setup.

## [0.2.1] - 2024-10-21
### Fixed
- User endpoints no longer expose sensitive fields (#1).

## [0.2.0] - 2024-10-15
### Added
- OpenAPI/Swagger documentation for API endpoints.

## [0.1.0] - 2024-06-26
### Added
- Initial project setup.
