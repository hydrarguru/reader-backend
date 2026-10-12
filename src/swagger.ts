export const swaggerDef = {
  failOnErrors: true, // Whether or not to throw when parsing errors. Defaults to false.
  definition: {
    openapi: "3.0.3",
    info: {
      title: "Reader API",
      version: "1.0.1",
      termsOfService: "https://www.github.com/hydrarguru/reader-backend",
      contact: {
        name: "Contact information",
        url: "https://www.github.com/hydrarguru",
        email: "henrik@engqvist.org",
      },
    },
    servers: [
      {
        url: "https://reader-api.fly.dev/",
        description: "Production API URL",
      },
      {
        url: "http://localhost:10000/",
        description: "Local development API URL",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        Message: {
          type: "object",
          properties: {
            message: { type: "string" },
          },
        },
        LoginResponse: {
          type: "object",
          properties: {
            token: {
              type: "string",
              description:
                'JWT, valid for 7 days. Send as "Authorization: Bearer <token>".',
            },
            user_id: { type: "string", format: "uuid" },
            is_admin: {
              type: "boolean",
              description: "Whether the user may create, edit and delete communities.",
            },
          },
        },
        TokenPayload: {
          type: "object",
          properties: {
            id: {
              type: "string",
              format: "uuid",
              description: "ID of the user the token was issued to.",
            },
            iat: { type: "integer", description: "Issued at (Unix seconds)." },
            exp: { type: "integer", description: "Expires at (Unix seconds)." },
          },
        },
        PublicUser: {
          type: "object",
          description: "A user without email, password or timestamps.",
          properties: {
            user_id: { type: "string", format: "uuid" },
            username: { type: "string" },
          },
        },
        Community: {
          type: "object",
          properties: {
            community_id: { type: "string", format: "uuid" },
            community_name: { type: "string" },
            community_desc: { type: "string" },
            community_image_url: { type: "string", nullable: true },
            community_rules: {
              type: "array",
              items: { $ref: "#/components/schemas/CommunityRule" },
            },
            created_at: { type: "string", format: "date-time" },
            modified_at: { type: "string", format: "date-time" },
          },
        },
        CommunityRule: {
          type: "object",
          required: ["rule_title"],
          properties: {
            rule_title: { type: "string", description: "1-100 characters." },
            rule_desc: { type: "string", description: "At most 500 characters." },
          },
        },
        Post: {
          type: "object",
          properties: {
            post_id: { type: "string", format: "uuid" },
            community_id: { type: "string", format: "uuid" },
            post_author: {
              type: "string",
              description: "Username of the author.",
            },
            post_title: { type: "string" },
            post_image_url: { type: "string", nullable: true },
            post_content: { type: "string" },
            post_score: { type: "integer" },
            comment_count: {
              type: "integer",
              description: "Number of comments on the post.",
            },
            created_at: { type: "string", format: "date-time" },
            modified_at: { type: "string", format: "date-time" },
          },
        },
        Comment: {
          type: "object",
          properties: {
            comment_id: { type: "string", format: "uuid" },
            post_id: { type: "string", format: "uuid" },
            comment_author: {
              type: "string",
              description: "Username of the author.",
            },
            comment_content: { type: "string" },
            comment_score: { type: "integer" },
            created_at: { type: "string", format: "date-time" },
            modified_at: { type: "string", format: "date-time" },
          },
        },
        PostVote: {
          type: "object",
          properties: {
            post_id: { type: "string", format: "uuid" },
            vote: {
              type: "integer",
              enum: [1, -1],
              description: "1 = upvote, -1 = downvote.",
            },
          },
        },
      },
    },
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
        name: "Comment",
        description: "Comment related endpoints.",
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
