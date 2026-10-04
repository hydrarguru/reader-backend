// One row per user per post, so a user can only count once towards a post's score.
export const postVotesTable = `
CREATE TABLE IF NOT EXISTS PostVotes (
post_id VARCHAR(36) NOT NULL,
user_id VARCHAR(36) NOT NULL,
vote TINYINT NOT NULL,
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
PRIMARY KEY (post_id, user_id),
CHECK (vote IN (-1, 1)),
FOREIGN KEY (post_id) REFERENCES Posts(post_id) ON DELETE CASCADE,
FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
)
`;
