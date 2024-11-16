export const postsTable = `
CREATE TABLE IF NOT EXISTS Posts (
post_id VARCHAR(36) PRIMARY KEY,
community_id VARCHAR(36) NOT NULL,
post_author VARCHAR(50) NOT NULL,
post_title VARCHAR(50) NOT NULL,
post_image_url VARCHAR(255),
post_content VARCHAR(255) NOT NULL,
post_score INT DEFAULT 0,
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)
`;