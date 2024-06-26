import express from "express";
import cors from "cors";
import { generateTables } from "./db";
import { UserRouter } from "./routes/User"
import { PostRouter } from "./routes/Post";
import { CommunityRouter } from "./routes/Community";

const shouldCreateTables = false;
const port = 8080;
const corsConfig = cors({ origin: "*" });
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(corsConfig)

app.use(UserRouter);
app.use(CommunityRouter);
app.use(PostRouter);

if (shouldCreateTables) {
  await generateTables();
  console.info("Tables generated.");
}
else {
  console.warn("Tables not generated.");
}

app.get("/", (req, res) => {
  res.send("Hello, World!");
});

app.listen(port, () => {
  console.log(`Listening on port ${port}.`);
});