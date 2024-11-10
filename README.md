# Reader API
This repository contains the source code for Reader API / Reader backend that powers [Reader](https://github.com/hydrarguru/reader).

Currently the API is pretty simple featuring CRUD operations for users, communities, & posts.

### TODO:

- [x] Implement JWT
- [ ] Secure API endpoints with JWT.
- [x] Fix issues with Swagger docs not rendering when navigating to /api docs.

## Tech Stack:
- Express.js.
- Sequalize ORM.
- MySQL Database.
- Swagger for API documentation.

## Build instructions:

Init project:
```
pnpm install
```

Building:
```
pnpm build
```

Running/start project:
```
pnpm start
```
