-- Databases created before #11 got their author foreign keys from ALTER TABLE ... ADD FOREIGN KEY, run on
-- every startup (hence names like Posts_ibfk_37) and without ON UPDATE CASCADE, so renaming a user with
-- posts or comments failed. 0001 uses CREATE TABLE IF NOT EXISTS and left those tables alone.
-- Drops every foreign key on the author columns, whatever it is called, and adds one that cascades.
-- Drop and add are separate statements: MySQL can't do both in one ALTER TABLE when the add copies the table.

SET SESSION group_concat_max_len = 1000000;

SELECT GROUP_CONCAT(CONCAT('DROP FOREIGN KEY `', CONSTRAINT_NAME, '`')) INTO @drops
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Posts' AND COLUMN_NAME = 'post_author'
  AND REFERENCED_TABLE_NAME IS NOT NULL;
SET @stmt = IFNULL(CONCAT('ALTER TABLE Posts ', @drops), 'DO 0');
PREPARE stmt FROM @stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
ALTER TABLE Posts ADD CONSTRAINT Posts_post_author_fk
  FOREIGN KEY (post_author) REFERENCES Users(username) ON UPDATE CASCADE;

SELECT GROUP_CONCAT(CONCAT('DROP FOREIGN KEY `', CONSTRAINT_NAME, '`')) INTO @drops
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Comments' AND COLUMN_NAME = 'comment_author'
  AND REFERENCED_TABLE_NAME IS NOT NULL;
SET @stmt = IFNULL(CONCAT('ALTER TABLE Comments ', @drops), 'DO 0');
PREPARE stmt FROM @stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
ALTER TABLE Comments ADD CONSTRAINT Comments_comment_author_fk
  FOREIGN KEY (comment_author) REFERENCES Users(username) ON UPDATE CASCADE;
