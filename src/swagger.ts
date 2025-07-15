export const swaggerDef = {
  failOnErrors: true, // Whether or not to throw when parsing errors. Defaults to false.
  definition: {
    openapi: "3.0.3",
    info: {
      title: "Reader API",
      version: "1.0.1",
    },
    termsOfService: "https://www.github.com/hydrarguru/reader-backend",
    contact: {
      name: "Contact information",
      url: "https://www.github.com/hydrarguru",
      email: "henrik@engqvist.org",
    },
    servers: [
      {
        url: "https://reader-api.fly.dev/",
        description: "Production API URL",
      },
    ],
    tags: [
      {
        name: "User",
        description: "User related endpoints.",
      },
      {
        name: "Post",
        description: "Post related endpoints.",
      },
      {
        name: "Community",
        description: "Community related endpoints.",
      },
      {
        name: "Auth",
        description: "Authentication related endpoints.",
      },
    ],
  },
  apis: ["./src/routes/*.ts"],
};
