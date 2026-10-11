// A community's rules, shown in the order of rule_order.
export const communityRulesTable = `
CREATE TABLE IF NOT EXISTS CommunityRules (
community_id VARCHAR(36) NOT NULL,
rule_order TINYINT UNSIGNED NOT NULL,
rule_title VARCHAR(100) NOT NULL,
rule_desc VARCHAR(500) NOT NULL DEFAULT '',
PRIMARY KEY (community_id, rule_order),
FOREIGN KEY (community_id) REFERENCES Communities(community_id) ON DELETE CASCADE
)
`;
