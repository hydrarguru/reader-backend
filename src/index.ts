import express from 'express';
import cors from "cors";
import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from 'swagger-ui-express';
import { swaggerDef } from './swagger.js';
import { checkConnection, generateTables } from "./db/database.js";
import { UserRouter } from "./routes/User.js"
import { PostRouter } from "./routes/Post.js";
import { CommunityRouter } from "./routes/Community.js";
import { BaseRouter } from "./routes/Base.js";

import dotenv from "dotenv";
dotenv.config();


const port = process.env.SERVER_PORT || 10000;
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

checkConnection();
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

console.info(`${shouldGenerateTables ? "Generating" : "Not generating"} tables...`);

if (shouldGenerateTables) {
  await generateTables();
}

app.listen(port, () => {
  console.log(`Listening on port ${port}.`);
});