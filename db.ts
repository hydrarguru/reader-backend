import { Sequelize, QueryTypes } from "sequelize";
import { usersTable } from "./models/User";
import { postsTable } from "./models/Post";
import { communitiesTable } from "./models/Community";
import type { User } from './types/UserType';
import type { Post } from './types/PostType';
import type { Community } from './types/CommunityType';

const databaseSchema = [
    usersTable,
    postsTable,
    communitiesTable
];

async function addForeignKey(targetTable: string, targetColumn: string, referenceTable: string, referenceColumn: string): Promise<void> {
    Client.query(`ALTER TABLE ${targetTable} ADD FOREIGN KEY (${targetColumn}) REFERENCES ${referenceTable}(${referenceColumn})`);    
}

export const Client = new Sequelize({
    dialect: "mysql",
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'fullstack',
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password',
    logging: console.log
});

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
    console.log('Results: ' + JSON.stringify(results));
    return results;
}

export async function deleteOne(table: string, column: string, value: string | number): Promise<void> {
    await Client.query(`DELETE FROM ${table} WHERE ${column} = :value`, {
        replacements: { value: value }
    });
};

/**
 * Updates a single row in the specified table with the given column value.
 * 
 * @param table - The name of the table to update.
 * @param tableIdColumnName - The name of the column that represents the table's ID.
 * @param tableIdValue - The value of the table's ID.
 * @param columnToUpdate - The name of the column to update.
 * @param updatedColumnValue - The new value for the column to be updated.
 * @returns A promise that resolves with void when the update is complete.
 */
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
    console.log('Metadata: ' + metadata);
    console.log('Results: ' + JSON.stringify(results));
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