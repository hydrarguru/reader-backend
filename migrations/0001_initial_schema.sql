-- The schema as it stood before migrations were introduced.
-- Uses IF NOT EXISTS so it is a no-op on databases that already have these tables.
-- Order matters: a table's foreign keys can only reference tables created before it.

CREATE TABLE IF NOT EXISTS Users (
  user_id VARCHAR(36) PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Communities (
  community_id VARCHAR(36) PRIMARY KEY,
  community_name VARCHAR(50) NOT NULL UNIQUE,
  community_image_url VARCHAR(255),
  community_desc VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Posts (
  post_id VARCHAR(36) PRIMARY KEY,
  community_id VARCHAR(36) NOT NULL,
  post_author VARCHAR(50) NOT NULL,
  post_title VARCHAR(50) NOT NULL,
  post_image_url VARCHAR(255),
  post_content TEXT NOT NULL,
  post_score INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (community_id) REFERENCES Communities(community_id) ON DELETE CASCADE,
  FOREIGN KEY (post_author) REFERENCES Users(username) ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS Comments (
  comment_id VARCHAR(36) PRIMARY KEY,
  post_id VARCHAR(36) NOT NULL,
  comment_author VARCHAR(50) NOT NULL,
  comment_content VARCHAR(255) NOT NULL,
  comment_score INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES Posts(post_id) ON DELETE CASCADE,
  FOREIGN KEY (comment_author) REFERENCES Users(username) ON UPDATE CASCADE
);

-- One row per user per post, so a user can only count once towards a post's score.
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
);

-- Users listed here may create, edit and delete communities.
CREATE TABLE IF NOT EXISTS Admins (
  user_id VARCHAR(36) PRIMARY KEY,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

-- A community's rules, shown in the order of rule_order.
CREATE TABLE IF NOT EXISTS CommunityRules (
  community_id VARCHAR(36) NOT NULL,
  rule_order TINYINT UNSIGNED NOT NULL,
  rule_title VARCHAR(100) NOT NULL,
  rule_desc VARCHAR(500) NOT NULL DEFAULT '',
  PRIMARY KEY (community_id, rule_order),
  FOREIGN KEY (community_id) REFERENCES Communities(community_id) ON DELETE CASCADE
);
