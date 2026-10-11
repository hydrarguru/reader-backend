import type { CommunityChanges } from "../functions/communityFunctions.js";

export function validateUUID(uuid: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(uuid);
}

export function validateCommunityName(name: string): boolean {
    return /^[a-zA-Z_]{1,20}$/.test(name);
}

export function validateVote(vote: unknown): vote is -1 | 0 | 1 {
    return vote === -1 || vote === 0 || vote === 1;
}
const MAX_RULES = 20;

/**
 * Checks the body of PATCH /community/:id. Returns the changes to apply (strings trimmed,
 * an empty banner URL turned into null), or an error message.
 */
export function validateCommunityChanges(body: unknown): CommunityChanges | string {
    if (typeof body !== "object" || body === null) return "Request body must be a JSON object.";
    const { community_desc, community_image_url, community_rules } = body as Record<string, unknown>;
    const changes: CommunityChanges = {};

    if (community_desc !== undefined) {
        if (typeof community_desc !== "string" || community_desc.trim().length < 1 || community_desc.trim().length > 255) {
            return "community_desc must be 1 to 255 characters.";
        }
        changes.community_desc = community_desc.trim();
    }

    if (community_image_url !== undefined) {
        const url = typeof community_image_url === "string" ? community_image_url.trim() : community_image_url;
        if (url === null || url === "") {
            changes.community_image_url = null;
        } else if (typeof url !== "string" || url.length > 255 || !/^https?:\/\/\S+$/.test(url)) {
            return "community_image_url must be an http(s) URL of at most 255 characters.";
        } else {
            changes.community_image_url = url;
        }
    }

    if (community_rules !== undefined) {
        if (!Array.isArray(community_rules) || community_rules.length > MAX_RULES) {
            return `community_rules must be an array of at most ${MAX_RULES} rules.`;
        }
        changes.community_rules = [];
        for (const rule of community_rules) {
            const title = typeof rule?.rule_title === "string" ? rule.rule_title.trim() : "";
            const desc = rule?.rule_desc ?? "";
            if (title.length < 1 || title.length > 100) return "Each rule_title must be 1 to 100 characters.";
            if (typeof desc !== "string" || desc.trim().length > 500) return "Each rule_desc must be at most 500 characters.";
            changes.community_rules.push({ rule_title: title, rule_desc: desc.trim() });
        }
    }

    if (Object.keys(changes).length === 0) return "Nothing to change.";
    return changes;
}
