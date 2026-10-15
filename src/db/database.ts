import "../env.js";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema.js";

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_NAME = process.env.DB_NAME || 'fullstack';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || 'password';
const DB_PORT = process.env.DB_PORT || '3306';

const LOCAL_HOSTS = ['localhost', '127.0.0.1', '::1'];

export function isLocalDatabase(): boolean {
    return LOCAL_HOSTS.includes(DB_HOST);
}

// Says which database the server talks to, for the startup log. Never includes credentials.
export function describeDatabase(): string {
    const where = isLocalDatabase() ? 'local' : 'production';
    return `${where} database (${DB_NAME} on ${DB_HOST}:${DB_PORT})`;
}

// Shared with the migration runner, which needs its own connection.
export const connectionConfig: mysql.ConnectionOptions = {
    host: DB_HOST,
    database: DB_NAME,
    user: DB_USER,
    password: DB_PASSWORD,
    port: parseInt(DB_PORT),
};

const pool = mysql.createPool(connectionConfig);

export const db = drizzle({ client: pool, schema, mode: "default" });

export async function checkConnection() {
    try {
        await db.execute(sql`SELECT 1`);
        console.log('Connection has been established successfully.');
    }
    catch (error) {
        console.error('Unable to connect to the database:', error);
    }
}
