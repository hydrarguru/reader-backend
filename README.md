# Reader API
This repository contains the source code for Reader API / Reader backend that powers [Reader](https://github.com/hydrarguru/reader).

Currently the API is pretty simple featuring CRUD operations for users, communities, & posts.

### TODO:

- [ ] Implement JWT tokens
- [ ] Secure API endpoints with an API key.
- [ ] Refactor Posts table to have auto incrementing ids instead of UUID for better sorting/indexing.
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