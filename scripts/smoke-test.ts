// End-to-end smoke test for auth, admins, SQL injection, voting, comments and foreign key behaviour.
//
// Start the server first (with shouldGenerateTables = true on a fresh database), then:
//   bun scripts/smoke-test.ts
//
// Uses DB_* and SERVER_PORT from .env. Set BASE_URL to test a different server.
// Only runs against a local database and a local server, so it can't touch production.
import { QueryTypes } from "sequelize";
import { Client } from "../src/db/database.js";

const LOCAL_HOSTS = ["localhost", "127.0.0.1", "::1"];
const BASE_URL = process.env.BASE_URL ?? `http://localhost:${process.env.SERVER_PORT || 10000}`;
const DB_HOST = process.env.DB_HOST || "localhost";
const DB_NAME = process.env.DB_NAME || "fullstack";

if (!LOCAL_HOSTS.includes(new URL(BASE_URL).hostname) || !LOCAL_HOSTS.includes(DB_HOST)) {
  console.error(`Refusing to run: API (${BASE_URL}) and DB_HOST (${DB_HOST}) must both be local.`);
  process.exit(1);
}

let passed = 0;
let failed = 0;

function check(name: string, ok: boolean, detail?: unknown) {
  if (ok) {
    passed++;
    console.log(`  \x1b[32m✓\x1b[0m ${name}`);
  } else {
    failed++;
    console.log(`  \x1b[31m✗\x1b[0m ${name}${detail === undefined ? "" : `\n      got: ${JSON.stringify(detail)}`}`);
  }
}

async function call(method: string, path: string, options: { body?: unknown; token?: string } = {}) {
  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (options.token) headers["Authorization"] = `Bearer ${options.token}`;
  const res = await fetch(BASE_URL + path, {
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const text = await res.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    json = undefined;
  }
  return { status: res.status, json, text };
}

// Unique per run so the script can be re-run against the same database.
const letters = (n: number) => Array.from({ length: n }, () => "abcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random() * 26)]).join("");
const runId = letters(8);
const username = `smoke_${runId}`;
const password = `pw-${runId}-Secret!`;
const communityName = `smoke_${runId}`;
const injectionTitle = "it's'); DROP TABLE Users; --";

async function main() {
  console.log(`Smoke test against ${BASE_URL} (database ${DB_NAME} on ${DB_HOST})\n`);

  try {
    await fetch(BASE_URL);
  } catch {
    console.error(`Could not reach ${BASE_URL}. Is the server running?`);
    process.exit(1);
  }

  console.log("Foreign keys");
  const fks = await Client.query<{ TABLE_NAME: string; REFERENCED_TABLE_NAME: string; DELETE_RULE: string; UPDATE_RULE: string }>(
    `SELECT TABLE_NAME, REFERENCED_TABLE_NAME, DELETE_RULE, UPDATE_RULE
     FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = :schema`,
    { type: QueryTypes.SELECT, replacements: { schema: DB_NAME } }
  );
  const fk = (table: string, ref: string) => fks.filter((f) => f.TABLE_NAME === table && f.REFERENCED_TABLE_NAME === ref);
  check("exactly 8 foreign keys (no duplicates)", fks.length === 8, fks.length);
  check("Posts → Communities cascades on delete", fk("Posts", "Communities")[0]?.DELETE_RULE === "CASCADE", fk("Posts", "Communities"));
  check("Posts → Users cascades on update", fk("Posts", "Users")[0]?.UPDATE_RULE === "CASCADE", fk("Posts", "Users"));
  check("Comments → Posts cascades on delete", fk("Comments", "Posts")[0]?.DELETE_RULE === "CASCADE", fk("Comments", "Posts"));
  check("Comments → Users cascades on update", fk("Comments", "Users")[0]?.UPDATE_RULE === "CASCADE", fk("Comments", "Users"));
  check("PostVotes → Posts cascades on delete", fk("PostVotes", "Posts")[0]?.DELETE_RULE === "CASCADE", fk("PostVotes", "Posts"));
  check("PostVotes → Users cascades on delete", fk("PostVotes", "Users")[0]?.DELETE_RULE === "CASCADE", fk("PostVotes", "Users"));
  check("Admins → Users cascades on delete", fk("Admins", "Users")[0]?.DELETE_RULE === "CASCADE", fk("Admins", "Users"));
  check("CommunityRules → Communities cascades on delete", fk("CommunityRules", "Communities")[0]?.DELETE_RULE === "CASCADE", fk("CommunityRules", "Communities"));

  console.log("\nSign-up");
  const signup = await call("POST", "/user/create", { body: { username, password, email: `${username}@example.com` } });
  check("creates a user (201)", signup.status === 201, signup);
  check("response doesn't include password or email", !!signup.json?.user && !("password" in signup.json.user) && !("email" in signup.json.user), signup.json);
  const userId: string | undefined = signup.json?.user?.user_id;
  const duplicate = await call("POST", "/user/create", { body: { username, password, email: `other_${username}@example.com` } });
  check("rejects a duplicate username (409)", duplicate.status === 409, duplicate);
  const missing = await call("POST", "/user/create", { body: { username: `x_${username}` } });
  check("rejects missing fields (400)", missing.status === 400, missing);
  const [stored] = await Client.query<{ password: string }>("SELECT password FROM Users WHERE username = :username", {
    type: QueryTypes.SELECT,
    replacements: { username },
  });
  check("password is stored hashed, not in plain text", !!stored && stored.password.startsWith("scrypt$") && stored.password !== password, stored?.password?.slice(0, 12));

  console.log("\nLogin");
  const wrong = await call("POST", "/auth/login", { body: { username, password: "wrong-password" } });
  check("wrong password is rejected (401)", wrong.status === 401, wrong);
  const unknown = await call("POST", "/auth/login", { body: { username: `nobody_${runId}`, password } });
  check("unknown user is rejected (401)", unknown.status === 401, unknown);
  const login = await call("POST", "/auth/login", { body: { username, password } });
  check("correct password returns a token (200)", login.status === 200 && typeof login.json?.token === "string", login);
  check("login returns the user's id", login.json?.user_id === userId, login.json);
  check("login says a new user is not an admin", login.json?.is_admin === false, login.json);
  const token: string = login.json?.token ?? "";
  const decoded = await call("GET", `/auth/decode?token=${encodeURIComponent(token)}`);
  check("token decodes to the user's id with an expiry", decoded.json?.id === userId && typeof decoded.json?.exp === "number", decoded.json);

  console.log("\nProtected routes");
  const noToken = await call("POST", "/community/create", { body: { community_name: communityName, community_desc: "Smoke test" } });
  check("community create without a token is rejected (401)", noToken.status === 401, noToken);
  const badToken = await call("POST", "/community/create", { body: { community_name: communityName, community_desc: "Smoke test" }, token: "not.a.token" });
  check("community create with a bad token is rejected (401)", badToken.status === 401, badToken);
  const notAdmin = await call("POST", "/community/create", { body: { community_name: communityName, community_desc: "Smoke test" }, token });
  check("community create by a non-admin is rejected (403)", notAdmin.status === 403, notAdmin);
  await Client.query("INSERT INTO Admins (user_id) VALUES (:userId)", { replacements: { userId } });
  const adminLogin = await call("POST", "/auth/login", { body: { username, password } });
  check("login says an admin is an admin", adminLogin.json?.is_admin === true, adminLogin.json);
  const community = await call("POST", "/community/create", { body: { community_name: communityName, community_desc: "Smoke test" }, token });
  check("community create by an admin succeeds (201)", community.status === 201, community);
  const fetchedCommunity = await call("GET", `/community/${communityName}`);
  const communityId: string | undefined = fetchedCommunity.json?.community?.community_id;
  check("community can be fetched by name", !!communityId, fetchedCommunity);
  const postNoToken = await call("POST", "/post/create", { body: { community_id: communityId, post_title: "x", post_content: "x" } });
  check("post create without a token is rejected (401)", postNoToken.status === 401, postNoToken);

  const otherUsername = `smoke2_${runId}`;
  await call("POST", "/user/create", { body: { username: otherUsername, password, email: `${otherUsername}@example.com` } });
  const otherToken: string = (await call("POST", "/auth/login", { body: { username: otherUsername, password } })).json?.token ?? "";

  console.log("\nEditing communities");
  const edit = (body: unknown, editToken = token, id = communityId) => call("PATCH", `/community/${id}`, { body, token: editToken });
  const editNoToken = await call("PATCH", `/community/${communityId}`, { body: { community_desc: "x" } });
  check("editing without a token is rejected (401)", editNoToken.status === 401, editNoToken);
  const editNotAdmin = await edit({ community_desc: "x" }, otherToken);
  check("editing by a non-admin is rejected (403)", editNotAdmin.status === 403, editNotAdmin);
  const editMissing = await edit({ community_desc: "x" }, token, crypto.randomUUID());
  check("editing a missing community is rejected (404)", editMissing.status === 404, editMissing);
  const editBadId = await edit({ community_desc: "x" }, token, "not-a-uuid");
  check("editing with a bad id is rejected (400)", editBadId.status === 400, editBadId);
  const editEmpty = await edit({});
  check("an edit with nothing to change is rejected (400)", editEmpty.status === 400, editEmpty);
  const editBlankDesc = await edit({ community_desc: "   " });
  check("a blank description is rejected (400)", editBlankDesc.status === 400, editBlankDesc);
  const editBadUrl = await edit({ community_image_url: "javascript:alert(1)" });
  check("a non-http banner URL is rejected (400)", editBadUrl.status === 400, editBadUrl);
  const editBadRule = await edit({ community_rules: [{ rule_title: "  " }] });
  check("a rule without a title is rejected (400)", editBadRule.status === 400, editBadRule);
  const editTooMany = await edit({ community_rules: Array.from({ length: 21 }, (_, i) => ({ rule_title: `Rule ${i}` })) });
  check("more than 20 rules are rejected (400)", editTooMany.status === 400, editTooMany);
  const rules = [
    { rule_title: " Be kind ", rule_desc: "No insults." },
    { rule_title: injectionTitle },
  ];
  const edited = await edit({ community_desc: " New description ", community_image_url: "https://example.com/banner.png", community_rules: rules });
  check(
    "an admin can change description, banner and rules (200)",
    edited.status === 200 &&
      edited.json?.community?.community_desc === "New description" &&
      edited.json?.community?.community_image_url === "https://example.com/banner.png",
    edited
  );
  const expectedRules = [{ rule_title: "Be kind", rule_desc: "No insults." }, { rule_title: injectionTitle, rule_desc: "" }];
  check("rules are trimmed and kept in order", JSON.stringify(edited.json?.community?.community_rules) === JSON.stringify(expectedRules), edited.json?.community?.community_rules);
  const byName = await call("GET", `/community/${communityName}`);
  check("GET /community/{name} includes the rules", JSON.stringify(byName.json?.community?.community_rules) === JSON.stringify(expectedRules), byName.json);
  const all = await call("GET", "/community/all");
  check("GET /community/all includes the rules", JSON.stringify(all.json?.find((c: any) => c.community_id === communityId)?.community_rules) === JSON.stringify(expectedRules), all.json?.find((c: any) => c.community_id === communityId));
  const partial = await edit({ community_image_url: "" });
  check(
    "an empty banner URL removes the banner and leaves the rest alone",
    partial.status === 200 && partial.json?.community?.community_image_url === null && partial.json?.community?.community_desc === "New description" && partial.json?.community?.community_rules?.length === 2,
    partial.json
  );
  const noRules = await edit({ community_rules: [] });
  check("an empty rules list removes all rules", noRules.status === 200 && noRules.json?.community?.community_rules?.length === 0, noRules.json);
  await edit({ community_rules: rules });

  console.log("\nPosts and SQL injection");
  const post = await call("POST", "/post/create", {
    body: { community_id: communityId, post_title: injectionTitle, post_content: "Body with 'quotes'", post_author: "someone_else" },
    token,
  });
  check("post create with a token succeeds (201) with comment_count 0", post.status === 201 && post.json?.post?.comment_count === 0, post);
  const postId: string | undefined = post.json?.post?.post_id;
  const fetchedPost = await call("GET", `/post/${postId}`);
  check("injection string is stored as plain text", fetchedPost.json?.post?.post_title === injectionTitle, fetchedPost.json?.post?.post_title);
  check("post_author comes from the token, not the request body", fetchedPost.json?.post?.post_author === username, fetchedPost.json?.post?.post_author);
  check("optional post_image_url is NULL, not 'undefined'", fetchedPost.json?.post?.post_image_url === null, fetchedPost.json?.post?.post_image_url);
  const usersTable = await Client.query("SHOW TABLES LIKE 'Users'", { type: QueryTypes.SELECT });
  check("Users table still exists", usersTable.length === 1);

  console.log("\nVoting");
  const scoreOf = async () => (await call("GET", `/post/${postId}`)).json?.post?.post_score;
  const vote = (value: unknown, voteToken = token) => call("POST", `/post/${postId}/vote`, { body: { vote: value }, token: voteToken });
  const voteNoToken = await call("POST", `/post/${postId}/vote`, { body: { vote: 1 } });
  check("voting without a token is rejected (401)", voteNoToken.status === 401, voteNoToken);
  const badVote = await vote(5);
  check("a vote other than 1, 0 or -1 is rejected (400)", badVote.status === 400, badVote);
  const missingPost = await call("POST", `/post/${crypto.randomUUID()}/vote`, { body: { vote: 1 }, token });
  check("voting on a missing post is rejected (404)", missingPost.status === 404, missingPost);
  const up = await vote(1);
  check("upvote returns the new score (200, score = 1)", up.status === 200 && up.json?.post_score === 1 && up.json?.vote === 1, up);
  await vote(1);
  await vote(1);
  check("upvoting again doesn't change the score", (await scoreOf()) === 1, await scoreOf());
  const down = await vote(-1);
  check("switching to a downvote moves the score by 2 (score = -1)", down.json?.post_score === -1 && (await scoreOf()) === -1, down.json);
  const myVotes = await call("GET", "/post/votes", { token });
  check("GET /post/votes lists the user's vote", myVotes.status === 200 && myVotes.json?.some((v: any) => v.post_id === postId && v.vote === -1), myVotes.json);
  const votesNoToken = await call("GET", "/post/votes");
  check("GET /post/votes without a token is rejected (401)", votesNoToken.status === 401, votesNoToken);
  const cleared = await vote(0);
  check("removing the vote resets the score (score = 0)", cleared.json?.post_score === 0 && (await scoreOf()) === 0, cleared.json);
  const myVotesAfter = await call("GET", "/post/votes", { token });
  check("removed vote is no longer listed", !myVotesAfter.json?.some((v: any) => v.post_id === postId), myVotesAfter.json);

  await vote(1);
  await vote(1, otherToken);
  check("two users upvoting gives a score of 2", (await scoreOf()) === 2, await scoreOf());
  const parallel = await Promise.all(Array.from({ length: 10 }, () => vote(-1)));
  check("10 parallel downvotes from one user count once (score = 0)", parallel.every((r) => r.status === 200) && (await scoreOf()) === 0, await scoreOf());

  console.log("\nComments");
  const emptyComments = await call("GET", `/post/${postId}/comments`);
  check("a post without comments lists an empty array (200)", emptyComments.status === 200 && Array.isArray(emptyComments.json) && emptyComments.json.length === 0, emptyComments);
  const commentsMissingPost = await call("GET", `/post/${crypto.randomUUID()}/comments`);
  check("listing comments on a missing post is rejected (404)", commentsMissingPost.status === 404, commentsMissingPost);
  const commentsBadId = await call("GET", "/post/not-a-uuid/comments");
  check("listing comments with a bad post id is rejected (400)", commentsBadId.status === 400, commentsBadId);
  const commentNoToken = await call("POST", `/post/${postId}/comments`, { body: { comment_content: "Hi" } });
  check("commenting without a token is rejected (401)", commentNoToken.status === 401, commentNoToken);
  const blankComment = await call("POST", `/post/${postId}/comments`, { body: { comment_content: "   " }, token });
  check("a blank comment is rejected (400)", blankComment.status === 400, blankComment);
  const longComment = await call("POST", `/post/${postId}/comments`, { body: { comment_content: "x".repeat(256) }, token });
  check("a comment over 255 characters is rejected (400)", longComment.status === 400, longComment);
  const commentMissingPost = await call("POST", `/post/${crypto.randomUUID()}/comments`, { body: { comment_content: "Hi" }, token });
  check("commenting on a missing post is rejected (404)", commentMissingPost.status === 404, commentMissingPost);
  const comment = await call("POST", `/post/${postId}/comments`, {
    body: { comment_content: `  ${injectionTitle}  `, comment_author: "someone_else" },
    token,
  });
  check("commenting with a token succeeds (201)", comment.status === 201 && !!comment.json?.comment?.created_at, comment);
  const commentId: string | undefined = comment.json?.comment?.comment_id;
  check("comment_author comes from the token, not the request body", comment.json?.comment?.comment_author === username, comment.json);
  check("comment content is trimmed and stored as plain text", comment.json?.comment?.comment_content === injectionTitle, comment.json);
  const countOf = async () => (await call("GET", `/post/${postId}`)).json?.post?.comment_count;
  check("post comment_count is 1 after one comment", (await countOf()) === 1, await countOf());
  const otherComment = await call("POST", `/post/${postId}/comments`, { body: { comment_content: "Second" }, token: otherToken });
  const allPosts = await call("GET", "/post/all");
  check("GET /post/all includes comment_count (2)", allPosts.json?.find((p: any) => p.post_id === postId)?.comment_count === 2, allPosts.json?.find((p: any) => p.post_id === postId));
  const communityPosts = await call("GET", `/community/${communityId}/post/all`);
  check("community post list includes comment_count (2)", communityPosts.json?.length === 1 && communityPosts.json[0]?.comment_count === 2, communityPosts.json);
  const otherCommentId: string | undefined = otherComment.json?.comment?.comment_id;
  const listed = await call("GET", `/post/${postId}/comments`);
  // created_at has one-second precision, so only the order of the timestamps is checked.
  const listedTimes = listed.json?.map((c: any) => Date.parse(c.created_at)) ?? [];
  check(
    "both comments are listed, oldest first",
    listed.json?.length === 2 && [commentId, otherCommentId].every((id) => listed.json.some((c: any) => c.comment_id === id)) && listedTimes[0] <= listedTimes[1],
    listed.json
  );
  const deleteNoToken = await call("DELETE", `/comment/${commentId}`);
  check("deleting a comment without a token is rejected (401)", deleteNoToken.status === 401, deleteNoToken);
  const deleteOthers = await call("DELETE", `/comment/${commentId}`, { token: otherToken });
  check("deleting someone else's comment is rejected (403)", deleteOthers.status === 403, deleteOthers);
  const deleteOwn = await call("DELETE", `/comment/${commentId}`, { token });
  check("deleting your own comment succeeds (200)", deleteOwn.status === 200, deleteOwn);
  const deleteAgain = await call("DELETE", `/comment/${commentId}`, { token });
  check("deleting it again is rejected (404)", deleteAgain.status === 404, deleteAgain);
  const afterDelete = await call("GET", `/post/${postId}/comments`);
  check("comment_count drops to 1 after a delete", (await countOf()) === 1, await countOf());
  check("the deleted comment is no longer listed", afterDelete.json?.length === 1 && afterDelete.json[0]?.comment_id === otherCommentId, afterDelete.json);

  console.log("\nCascading delete");
  const deleteNotAdmin = await call("DELETE", `/community/${communityId}`, { token: otherToken });
  check("community delete by a non-admin is rejected (403)", deleteNotAdmin.status === 403, deleteNotAdmin);
  const deleted = await call("DELETE", `/community/${communityId}`, { token });
  check("community delete succeeds (200)", deleted.status === 200, deleted);
  const gone = await call("GET", `/post/${postId}`);
  check("the community's post was deleted with it (404)", gone.status === 404, gone);
  const [leftoverVotes] = await Client.query<{ n: number }>("SELECT COUNT(*) AS n FROM PostVotes WHERE post_id = :postId", {
    type: QueryTypes.SELECT,
    replacements: { postId },
  });
  check("the post's votes were deleted with it", Number(leftoverVotes?.n) === 0, leftoverVotes);
  const [leftoverComments] = await Client.query<{ n: number }>("SELECT COUNT(*) AS n FROM Comments WHERE post_id = :postId", {
    type: QueryTypes.SELECT,
    replacements: { postId },
  });
  check("the post's comments were deleted with it", Number(leftoverComments?.n) === 0, leftoverComments);
  const [leftoverRules] = await Client.query<{ n: number }>("SELECT COUNT(*) AS n FROM CommunityRules WHERE community_id = :communityId", {
    type: QueryTypes.SELECT,
    replacements: { communityId },
  });
  check("the community's rules were deleted with it", Number(leftoverRules?.n) === 0, leftoverRules);

  await Client.query("DELETE FROM Users WHERE username IN (:usernames)", { replacements: { usernames: [username, `smoke2_${runId}`] } });

  console.log(`\n${passed} passed, ${failed} failed`);
}

try {
  await main();
} catch (err) {
  failed++;
  console.error("\nSmoke test crashed:", err);
} finally {
  await Client.close();
  process.exit(failed === 0 ? 0 : 1);
}
