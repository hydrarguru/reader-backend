import "../env.js";
import { Sequelize, QueryTypes, type Options } from "sequelize";
import type { User } from '../types/UserType.js';
import type { Post } from '../types/PostType.js';
import type { Community } from '../types/CommunityType.js';
import { Comment } from "../types/CommentsType.js";

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
export const connectionOptions: Options = {
    dialect: "mysql",
    host: DB_HOST,
    database: DB_NAME,
    username: DB_USER,
    password: DB_PASSWORD,
    port: parseInt(DB_PORT),
    logging: false
};

export const Client = new Sequelize(connectionOptions);

export async function checkConnection() {
    try {
        await Client.authenticate();
        console.log('Connection has been established successfully.');
    }
    catch (error) {
        console.error('Unable to connect to the database:', error);
    }
}

export async function checkForDuplicate(table: string, column: string, value: string | number): Promise<boolean> {
    const [results] = await Client.query(`SELECT * FROM ${table} WHERE ${column} = :value`, {
        type: QueryTypes.SELECT,
        replacements: { value: value }
    });
    if (results === undefined || results === null) {
        return false;
    }
    else {
        return true;
    }
};

export async function checkIfExists(table: string, column: string, value: string | number): Promise<boolean> {
    const [results] = await Client.query(`SELECT * FROM ${table} WHERE ${column} = :value`, {
        type: QueryTypes.SELECT,
        replacements: { value: value }
    });
    if (results === undefined || results === null) {
        return false;
    }
    else {
        return true;
    }
};

export async function getAll(table: string) {
    const [results] = await Client.query(`SELECT * FROM ${table} LIMIT 100`);
    return results;
}

export async function deleteOne(table: string, column: string, value: string | number): Promise<void> {
    await Client.query(`DELETE FROM ${table} WHERE ${column} = :value`, {
        replacements: { value: value }
    });
};


export async function updateOne(table: string, tableIdColumnName: string, tableIdValue: string, columnToUpdate: string, updatedColumnValue: string | number): Promise<void> {
    if(await checkIfExists(table, tableIdColumnName, tableIdValue)) {
        await Client.query(`UPDATE ${table} SET ${columnToUpdate} = :newValue WHERE ${tableIdColumnName} = :targetId`, {
            type: QueryTypes.UPDATE,
            replacements: { newValue: updatedColumnValue, targetId: tableIdValue }
        });
    }
    else {
        console.error('Could not update row.');
    }
}

export async function getOne(table: string, column: string, value: string | number): Promise<object | null> {
    const [results, metadata] = await Client.query(`SELECT * FROM ${table} WHERE ${column} = :value`, {
        type: QueryTypes.SELECT,
        replacements: { value: value }
    });
    if (results === undefined || results === null) {
        return null;
    }
    else {
        return results;
    }
}

export async function insertOne(table: string, item: User | Post | Community | Comment): Promise<void> {
    // Undefined fields are left out so the column's default (or NOT NULL check) applies.
    const entries = Object.entries(item).filter(([, value]) => value !== undefined);
    const columns = entries.map(([column]) => column).join(', ');
    const placeholders = entries.map(([column]) => `:${column}`).join(', ');
    await Client.query(`INSERT INTO ${table} (${columns}) VALUES (${placeholders})`, {
        type: QueryTypes.INSERT,
        replacements: Object.fromEntries(entries)
    });
}