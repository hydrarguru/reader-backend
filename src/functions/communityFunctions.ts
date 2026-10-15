import { asc, eq, inArray } from 'drizzle-orm';
import type { Community, CommunityRule } from '../types/CommunityType.js'
import { db } from '../db/database.js'
import { communities, communityRules } from '../db/schema.js'

export async function createCommunity(newCommunity: Community): Promise<boolean> {
    const [duplicate] = await db.select({ community_id: communities.community_id }).from(communities)
        .where(eq(communities.community_name, newCommunity.community_name));
    if (duplicate !== undefined) {
        console.error('Community name already exists');
        return false;
    }
    else {
        await db.insert(communities).values({
            community_id: newCommunity.community_id ?? crypto.randomUUID(),
            community_name: newCommunity.community_name,
            community_desc: newCommunity.community_desc,
            community_image_url: newCommunity.community_image_url,
        });
        console.log('Community created');
        console.table(newCommunity);
        return true;
    }
}

export async function deleteCommunity(community_id: string) {
    await db.delete(communities).where(eq(communities.community_id, community_id));
    console.log('Community deleted');
}

// Adds each community's rules, in order, as community_rules.
async function withRules(found: Community[]): Promise<Community[]> {
    if (found.length === 0) return found;
    const rules = await db
        .select({ community_id: communityRules.community_id, rule_title: communityRules.rule_title, rule_desc: communityRules.rule_desc })
        .from(communityRules)
        .where(inArray(communityRules.community_id, found.map((c) => c.community_id!)))
        .orderBy(asc(communityRules.community_id), asc(communityRules.rule_order));
    return found.map((community) => ({
        ...community,
        community_rules: rules
            .filter((rule) => rule.community_id === community.community_id)
            .map(({ rule_title, rule_desc }) => ({ rule_title, rule_desc })),
    }));
}

export async function getAllCommunities(): Promise<Community[]> {
    return withRules(await db.select().from(communities).limit(100));
}

export async function getCommunityBy(column: 'community_name' | 'community_id', value: string): Promise<Community | null> {
    const found = await db.select().from(communities).where(eq(communities[column], value));
    if (found.length === 0) return null;
    return (await withRules(found))[0];
}

export type CommunityChanges = {
    community_desc?: string;
    community_image_url?: string | null;
    community_rules?: CommunityRule[];
};

// Applies the given changes; fields left out stay as they are. community_rules replaces all rules.
// Returns the updated community, or null if it doesn't exist.
export async function updateCommunity(community_id: string, changes: CommunityChanges): Promise<Community | null> {
    const found = await db.transaction(async (tx) => {
        const [existing] = await tx.select({ community_id: communities.community_id }).from(communities)
            .where(eq(communities.community_id, community_id))
            .for('update');
        if (existing === undefined) return false;

        const { community_desc, community_image_url } = changes;
        if (community_desc !== undefined || community_image_url !== undefined) {
            // Drizzle leaves undefined fields out of the SET clause.
            await tx.update(communities).set({ community_desc, community_image_url })
                .where(eq(communities.community_id, community_id));
        }
        if (changes.community_rules !== undefined) {
            await tx.delete(communityRules).where(eq(communityRules.community_id, community_id));
            if (changes.community_rules.length > 0) {
                await tx.insert(communityRules).values(changes.community_rules.map((rule, rule_order) => ({
                    community_id,
                    rule_order,
                    rule_title: rule.rule_title,
                    rule_desc: rule.rule_desc,
                })));
            }
        }
        return true;
    });
    return found ? getCommunityBy('community_id', community_id) : null;
}
