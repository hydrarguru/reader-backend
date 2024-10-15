import express from "express";
import cors from "cors";
import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from 'swagger-ui-express';
import { swaggerDef } from "./swagger";
import { generateTables } from "./src/db/database";
import { UserRouter } from "./src/routes/User"
import { PostRouter } from "./src/routes/Post";
import { CommunityRouter } from "./src/routes/Community";
import { BaseRouter } from "./src/routes/Base";

const port = process.env.PORT || 8080;
const shouldGenerateTables = false;
const corsConfig = cors({ origin: "*" });
const app = express();
const swaggerSpec = swaggerJSDoc(swaggerDef);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(corsConfig)

app.use(BaseRouter);
app.use(UserRouter);
app.use(CommunityRouter);
app.use(PostRouter);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

console.info(`${shouldGenerateTables ? "Generating" : "Not generating"} tables...`);

if (shouldGenerateTables) {
  await generateTables();
}

app.listen(port, () => {
  console.log(`Listening on port ${port}.`);
});