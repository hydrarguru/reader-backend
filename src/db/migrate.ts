// Applies the SQL files in migrations/ in filename order, recording each one in SchemaMigrations
// so it only ever runs once per database.
//
//   pnpm migrate                 apply pending migrations to the local database
//   pnpm migrate --prod          apply pending migrations to the production database in .env
//   pnpm migrate:status          list applied and pending migrations (add --prod for production)
//   pnpm migrate:create <name>   add a new, empty migration file
//
// Migrations only go forwards: to undo one, write a new migration that reverses it.
// Never edit a migration that has already been applied somewhere, since it won't run again there.
import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { Sequelize, QueryTypes } from "sequelize";
import { connectionOptions, describeDatabase, isLocalDatabase } from "./database.js";

// Resolves to the same folder from both src/db and dist/db.
const MIGRATIONS_DIR = fileURLToPath(new URL("../../migrations/", import.meta.url));
const MIGRATION_FILE = /^(\d{4})_[a-z0-9_]+\.sql$/;

type Migration = { name: string; sql: string; checksum: string };
type AppliedMigration = { name: string; checksum: string; applied_at: Date };

async function readMigrations(): Promise<Migration[]> {
  const files = (await readdir(MIGRATIONS_DIR)).filter((file) => MIGRATION_FILE.test(file)).sort();
  return Promise.all(
    files.map(async (name) => {
      const sql = await readFile(path.join(MIGRATIONS_DIR, name), "utf8");
      return { name, sql, checksum: createHash("sha256").update(sql).digest("hex") };
    }),
  );
}

// A separate connection, because a migration file may hold several statements.
function connect(): Sequelize {
  return new Sequelize({ ...connectionOptions, dialectOptions: { multipleStatements: true } });
}

async function readApplied(db: Sequelize): Promise<Map<string, AppliedMigration>> {
  await db.query(`
    CREATE TABLE IF NOT EXISTS SchemaMigrations (
      name VARCHAR(255) PRIMARY KEY,
      checksum CHAR(64) NOT NULL,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  const rows = await db.query<AppliedMigration>("SELECT name, checksum, applied_at FROM SchemaMigrations", {
    type: QueryTypes.SELECT,
  });
  return new Map(rows.map((row) => [row.name, row]));
}

function warnAboutDrift(migrations: Migration[], applied: Map<string, AppliedMigration>) {
  const files = new Map(migrations.map((migration) => [migration.name, migration]));
  for (const row of applied.values()) {
    const file = files.get(row.name);
    if (!file) {
      console.warn(`Warning: ${row.name} was applied but its file is missing.`);
    } else if (file.checksum !== row.checksum) {
      console.warn(`Warning: ${row.name} has changed since it was applied. The change will not be run.`);
    }
  }
}

function hasStatements(sql: string): boolean {
  return sql.replace(/--.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "").trim() !== "";
}

async function up(args: string[]) {
  if (!isLocalDatabase() && !args.includes("--prod")) {
    console.error(`Refusing to migrate the ${describeDatabase()}. Pass --prod if you mean it.`);
    process.exitCode = 1;
    return;
  }

  const db = connect();
  try {
    const migrations = await readMigrations();
    const applied = await readApplied(db);
    warnAboutDrift(migrations, applied);

    const pending = migrations.filter((migration) => !applied.has(migration.name));
    console.log(`Migrating the ${describeDatabase()}.`);
    if (pending.length === 0) {
      console.log("Already up to date.");
      return;
    }

    for (const migration of pending) {
      if (!hasStatements(migration.sql)) {
        console.error(`${migration.name} has no SQL in it. Write the migration, or delete the file.`);
        process.exitCode = 1;
        return;
      }
      try {
        await db.query(migration.sql);
      } catch (error) {
        // MySQL commits schema changes immediately, so statements before the failing one have taken effect.
        console.error(`Failed to apply ${migration.name}. Statements before the failing one have already been applied.`);
        console.error(error instanceof Error ? error.message : error);
        process.exitCode = 1;
        return;
      }
      await db.query("INSERT INTO SchemaMigrations (name, checksum) VALUES (:name, :checksum)", {
        replacements: { name: migration.name, checksum: migration.checksum },
      });
      console.log(`  applied ${migration.name}`);
    }
    console.log(`Applied ${pending.length} migration${pending.length === 1 ? "" : "s"}.`);
  } finally {
    await db.close();
  }
}

async function status() {
  const db = connect();
  try {
    const migrations = await readMigrations();
    const applied = await readApplied(db);
    console.log(`Migrations on the ${describeDatabase()}:`);
    for (const migration of migrations) {
      const row = applied.get(migration.name);
      const state = row ? `applied ${row.applied_at.toISOString()}` : "pending";
      console.log(`  ${state.padEnd(32)}  ${migration.name}`);
    }
    warnAboutDrift(migrations, applied);
  } finally {
    await db.close();
  }
}

async function create(args: string[]) {
  const slug = args
    .filter((arg) => !arg.startsWith("--"))
    .join("_")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
  if (!slug) {
    console.error("Give the migration a name, e.g. pnpm migrate:create add post flair");
    process.exitCode = 1;
    return;
  }

  const migrations = await readMigrations();
  const last = migrations.at(-1)?.name.match(MIGRATION_FILE)?.[1] ?? "0000";
  const name = `${String(Number(last) + 1).padStart(4, "0")}_${slug}.sql`;
  await writeFile(path.join(MIGRATIONS_DIR, name), `-- ${args.join(" ")}\n\n`, { flag: "wx" });
  console.log(`Created migrations/${name}`);
}

const [command = "up", ...args] = process.argv.slice(2);
const commands: Record<string, (args: string[]) => Promise<void>> = { up, status, create };

if (commands[command]) {
  await commands[command](args);
} else {
  console.error(`Unknown command "${command}". Use up, status or create.`);
  process.exitCode = 1;
}
