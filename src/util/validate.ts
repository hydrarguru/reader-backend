import type { CommunityChanges } from "../functions/communityFunctions.js";
import type { PostChanges } from "../functions/postFunctions.js";
import type { UserChanges } from "../functions/userFunctions.js";

export function validateUUID(uuid: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(uuid);
}

export function validateCommunityName(name: string): boolean {
    return /^[a-zA-Z_]{1,20}$/.test(name);
}

export function validateCommentContent(content: unknown, maxLength: number): string | null {
    const trimmed = typeof content === "string" ? content.trim() : "";
    return trimmed.length >= 1 && trimmed.length <= maxLength ? trimmed : null;
}

export function validateVote(vote: unknown): vote is -1 | 0 | 1 {
    return vote === -1 || vote === 0 || vote === 1;
}
const MAX_RULES = 20;

// Shared by community banners and post images: an http(s) URL, or "" / null to remove the image.
function validateImageUrl(value: unknown): { url: string | null } | null {
    const url = typeof value === "string" ? value.trim() : value;
    if (url === null || url === "") return { url: null };
    if (typeof url !== "string" || url.length > 255 || !/^https?:\/\/\S+$/.test(url)) return null;
    return { url };
}

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
        const image = validateImageUrl(community_image_url);
        if (image === null) return "community_image_url must be an http(s) URL of at most 255 characters.";
        changes.community_image_url = image.url;
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

/**
 * Checks the body of PATCH /post/:id. Returns the changes to apply (strings trimmed,
 * an empty image URL turned into null), or an error message.
 */
export function validatePostChanges(body: unknown): PostChanges | string {
    if (typeof body !== "object" || body === null) return "Request body must be a JSON object.";
    const { post_title, post_content, post_image_url } = body as Record<string, unknown>;
    const changes: PostChanges = {};

    if (post_title !== undefined) {
        if (typeof post_title !== "string" || post_title.trim().length < 1 || post_title.trim().length > 50) {
            return "post_title must be 1 to 50 characters.";
        }
        changes.post_title = post_title.trim();
    }

    if (post_content !== undefined) {
        if (typeof post_content !== "string" || post_content.trim().length < 1) {
            return "post_content must not be empty.";
        }
        changes.post_content = post_content.trim();
    }

    if (post_image_url !== undefined) {
        const image = validateImageUrl(post_image_url);
        if (image === null) return "post_image_url must be an http(s) URL of at most 255 characters.";
        changes.post_image_url = image.url;
    }

    if (Object.keys(changes).length === 0) return "Nothing to change.";
    return changes;
}

/**
 * Checks the body of PATCH /user/:id. Returns the changes to apply (username and email
 * trimmed), or an error message. Whether current_password is right is checked by the route.
 */
export function validateUserChanges(body: unknown): UserChanges | string {
    if (typeof body !== "object" || body === null) return "Request body must be a JSON object.";
    const { username, email, password, current_password } = body as Record<string, unknown>;
    const changes: UserChanges = {};

    if (username !== undefined) {
        if (typeof username !== "string" || !/^\S{1,50}$/.test(username.trim())) {
            return "username must be 1 to 50 characters without spaces.";
        }
        changes.username = username.trim();
    }

    if (email !== undefined) {
        if (typeof email !== "string" || email.trim().length > 255 || !/^[^\s@]+@[^\s@]+$/.test(email.trim())) {
            return "email must be a valid email address.";
        }
        changes.email = email.trim();
    }

    if (password !== undefined) {
        if (typeof password !== "string" || password === "") return "password must not be empty.";
        if (typeof current_password !== "string" || current_password === "") {
            return "current_password is required to change the password.";
        }
        changes.password = password;
    }

    if (Object.keys(changes).length === 0) return "Nothing to change.";
    return changes;
}
