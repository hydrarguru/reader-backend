import { Sequelize, QueryTypes } from "sequelize";
import { usersTable } from "../models/User.js";
import { postsTable } from "../models/Post.js";
import { communitiesTable } from "../models/Community.js";
import type { User } from '../types/UserType.js';
import type { Post } from '../types/PostType.js';
import type { Community } from '../types/CommunityType.js';

import dotenv from "dotenv";
dotenv.config();

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_NAME = process.env.DB_NAME || 'fullstack';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || 'password';
const DB_PORT = process.env.DB_PORT || '3306';

const databaseSchema = [
    usersTable,
    postsTable,
    communitiesTable
];

async function addForeignKey(targetTable: string, targetColumn: string, referenceTable: string, referenceColumn: string): Promise<void> {
    await Client.query(`ALTER TABLE ${targetTable} ADD FOREIGN KEY (${targetColumn}) REFERENCES ${referenceTable}(${referenceColumn})`);
}

export const Client = new Sequelize({
    dialect: "mysql",
    host: DB_HOST,
    database: DB_NAME,
    username: DB_USER,
    password: DB_PASSWORD,
    port: parseInt(DB_PORT),
    logging: false
});

export async function checkConnection() {
    try {
        await Client.authenticate();
        console.log('Connection has been established successfully.');
    }
    catch (error) {
        console.error('Unable to connect to the database:', error);
    }
}

export async function generateTables() {
    for (const table of databaseSchema) {
        await Client.query(table);
    }
    await addForeignKey("Posts", "post_author", "Users", "user_id");
    await addForeignKey("Posts", "community_id", "Communities", "community_id");
};

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

export async function insertOne(table: string, item: User | Post | Community): Promise<void> {
    const columns = Object.keys(item).join(', ');
    const values = Object.values(item).join("', '");
    await Client.query(`INSERT INTO ${table} (${columns}) VALUES ('${values}')`);
}