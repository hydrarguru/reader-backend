// Users listed here may create, edit and delete communities.
export const adminsTable = `
CREATE TABLE IF NOT EXISTS Admins (
user_id VARCHAR(36) PRIMARY KEY,
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
)
`;
