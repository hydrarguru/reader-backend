import { QueryTypes } from 'sequelize';
import type { Community, CommunityRule } from '../types/CommunityType.js'
import { Client, insertOne, checkForDuplicate, deleteOne } from '../db/database.js'

export async function createCommunity(newCommunity: Community): Promise<boolean> {
    if (await checkForDuplicate('Communities', 'community_name', newCommunity.community_name)) {
        console.error('Community name already exists');
        return false;
    }
    else {
        await insertOne('Communities', newCommunity);
        console.log('Community created');
        console.table(newCommunity);
        return true;
    }    
}

export async function deleteCommunity(community_id: string) {
    await deleteOne('Communities', 'community_id', community_id);
    console.log('Community deleted');
}

// Adds each community's rules, in order, as community_rules.
async function withRules(communities: Community[]): Promise<Community[]> {
    if (communities.length === 0) return communities;
    const rules = await Client.query<CommunityRule & { community_id: string }>(
        `SELECT community_id, rule_title, rule_desc FROM CommunityRules
         WHERE community_id IN (:ids) ORDER BY community_id, rule_order`,
        { type: QueryTypes.SELECT, replacements: { ids: communities.map((c) => c.community_id) } }
    );
    return communities.map((community) => ({
        ...community,
        community_rules: rules
            .filter((rule) => rule.community_id === community.community_id)
            .map(({ rule_title, rule_desc }) => ({ rule_title, rule_desc })),
    }));
}

export async function getAllCommunities(): Promise<Community[]> {
    const communities = await Client.query<Community>('SELECT * FROM Communities LIMIT 100', { type: QueryTypes.SELECT });
    return withRules(communities);
}

export async function getCommunityBy(column: 'community_name' | 'community_id', value: string): Promise<Community | null> {
    const communities = await Client.query<Community>(`SELECT * FROM Communities WHERE ${column} = :value`, {
        type: QueryTypes.SELECT,
        replacements: { value },
    });
    if (communities.length === 0) return null;
    return (await withRules(communities))[0];
}

export type CommunityChanges = {
    community_desc?: string;
    community_image_url?: string | null;
    community_rules?: CommunityRule[];
};

// Applies the given changes; fields left out stay as they are. community_rules replaces all rules.
// Returns the updated community, or null if it doesn't exist.
export async function updateCommunity(community_id: string, changes: CommunityChanges): Promise<Community | null> {
    const found = await Client.transaction(async (transaction) => {
        const [existing] = await Client.query(
            'SELECT community_id FROM Communities WHERE community_id = :community_id FOR UPDATE',
            { type: QueryTypes.SELECT, replacements: { community_id }, transaction }
        );
        if (existing === undefined) return false;

        const columns = (['community_desc', 'community_image_url'] as const).filter((column) => changes[column] !== undefined);
        if (columns.length > 0) {
            await Client.query(
                `UPDATE Communities SET ${columns.map((column) => `${column} = :${column}`).join(', ')} WHERE community_id = :community_id`,
                { replacements: { ...Object.fromEntries(columns.map((column) => [column, changes[column]])), community_id }, transaction }
            );
        }
        if (changes.community_rules !== undefined) {
            await Client.query('DELETE FROM CommunityRules WHERE community_id = :community_id', { replacements: { community_id }, transaction });
            for (const [rule_order, rule] of changes.community_rules.entries()) {
                await Client.query(
                    `INSERT INTO CommunityRules (community_id, rule_order, rule_title, rule_desc)
                     VALUES (:community_id, :rule_order, :rule_title, :rule_desc)`,
                    { replacements: { community_id, rule_order, ...rule }, transaction }
                );
            }
        }
        return true;
    });
    return found ? getCommunityBy('community_id', community_id) : null;
}
