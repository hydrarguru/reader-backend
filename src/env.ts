// Loads .env.<NODE_ENV> (development unless set) on top of .env, so local runs use the local
// database in .env.development. Import this before anything that reads process.env.
// Variables already set in the environment, like Fly secrets, always win.
import dotenv from "dotenv";

// Passing --prod, e.g. `pnpm start --prod`, uses the production settings in .env.
if (process.argv.includes("--prod")) {
  process.env.NODE_ENV = "production";
}

dotenv.config({ path: [`.env.${process.env.NODE_ENV || "development"}`, ".env"], quiet: true });
