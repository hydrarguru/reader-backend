import "./env.js";
import express from "express";
import cors from "cors";
import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { swaggerDef } from "./swagger.js";
import { checkConnection, describeDatabase } from "./db/database.js";
import { UserRouter } from "./routes/User.js";
import { PostRouter } from "./routes/Post.js";
import { CommunityRouter } from "./routes/Community.js";
import { AuthRouter } from "./routes/Auth.js";
import { CommentRouter } from "./routes/Comment.js";

const port = process.env.SERVER_PORT || 10000;
const corsConfig = cors({ origin: "*" });
const app = express();
const swaggerSpec = swaggerJSDoc(swaggerDef);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(corsConfig);

app.use(AuthRouter);
app.use(UserRouter);
app.use(CommunityRouter);
app.use(PostRouter);
app.use(CommentRouter);

checkConnection();
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get("/", (req, res) => {
  res.redirect("/api-docs");
});

app.listen(port, () => {
  console.log(`Listening on port ${port}.`);
  console.log(`Using the ${describeDatabase()}.`);
});
