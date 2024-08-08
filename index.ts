import express from "express";
import cors from "cors";
import { generateTables } from "./src/db/database";
import { UserRouter } from "./src/routes/User"
import { PostRouter } from "./src/routes/Post";
import { CommunityRouter } from "./src/routes/Community";

const port = process.env.PORT || 8080;
const shouldGenerateTables = false;
const corsConfig = cors({ origin: "*" });
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(corsConfig)

app.use(UserRouter);
app.use(CommunityRouter);
app.use(PostRouter);

if (shouldGenerateTables) {
  await generateTables();
  console.info("Tables generated.");
}
else {
  console.warn("Tables not generated.");
}

app.get("/", (req, res) => {
  res.send('<h1>Reader Backend API</h1>');
});

app.listen(port, () => {
  console.log(`Listening on port ${port}.`);
});