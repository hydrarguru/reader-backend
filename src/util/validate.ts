export function validateUUID(uuid: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(uuid);
}

export function validateCommunityName(name: string): boolean {
    return /^[a-zA-Z_]{1,20}$/.test(name);
}

export function validateVote(vote: unknown): vote is -1 | 0 | 1 {
    return vote === -1 || vote === 0 || vote === 1;
}