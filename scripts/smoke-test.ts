// End-to-end smoke test for auth, SQL injection, voting and foreign key behaviour.
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
  check("exactly 6 foreign keys (no duplicates)", fks.length === 6, fks.length);
  check("Posts → Communities cascades on delete", fk("Posts", "Communities")[0]?.DELETE_RULE === "CASCADE", fk("Posts", "Communities"));
  check("Posts → Users cascades on update", fk("Posts", "Users")[0]?.UPDATE_RULE === "CASCADE", fk("Posts", "Users"));
  check("Comments → Posts cascades on delete", fk("Comments", "Posts")[0]?.DELETE_RULE === "CASCADE", fk("Comments", "Posts"));
  check("Comments → Users cascades on update", fk("Comments", "Users")[0]?.UPDATE_RULE === "CASCADE", fk("Comments", "Users"));
  check("PostVotes → Posts cascades on delete", fk("PostVotes", "Posts")[0]?.DELETE_RULE === "CASCADE", fk("PostVotes", "Posts"));
  check("PostVotes → Users cascades on delete", fk("PostVotes", "Users")[0]?.DELETE_RULE === "CASCADE", fk("PostVotes", "Users"));

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
  const token: string = login.json?.token ?? "";
  const decoded = await call("GET", `/auth/decode?token=${encodeURIComponent(token)}`);
  check("token decodes to the user's id with an expiry", decoded.json?.id === userId && typeof decoded.json?.exp === "number", decoded.json);

  console.log("\nProtected routes");
  const noToken = await call("POST", "/community/create", { body: { community_name: communityName, community_desc: "Smoke test" } });
  check("community create without a token is rejected (401)", noToken.status === 401, noToken);
  const badToken = await call("POST", "/community/create", { body: { community_name: communityName, community_desc: "Smoke test" }, token: "not.a.token" });
  check("community create with a bad token is rejected (401)", badToken.status === 401, badToken);
  const community = await call("POST", "/community/create", { body: { community_name: communityName, community_desc: "Smoke test" }, token });
  check("community create with a token succeeds (201)", community.status === 201, community);
  const fetchedCommunity = await call("GET", `/community/${communityName}`);
  const communityId: string | undefined = fetchedCommunity.json?.community?.community_id;
  check("community can be fetched by name", !!communityId, fetchedCommunity);
  const postNoToken = await call("POST", "/post/create", { body: { community_id: communityId, post_title: "x", post_content: "x" } });
  check("post create without a token is rejected (401)", postNoToken.status === 401, postNoToken);

  console.log("\nPosts and SQL injection");
  const post = await call("POST", "/post/create", {
    body: { community_id: communityId, post_title: injectionTitle, post_content: "Body with 'quotes'", post_author: "someone_else" },
    token,
  });
  check("post create with a token succeeds (201)", post.status === 201, post);
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

  const otherUsername = `smoke2_${runId}`;
  await call("POST", "/user/create", { body: { username: otherUsername, password, email: `${otherUsername}@example.com` } });
  const otherToken: string = (await call("POST", "/auth/login", { body: { username: otherUsername, password } })).json?.token ?? "";
  await vote(1);
  await vote(1, otherToken);
  check("two users upvoting gives a score of 2", (await scoreOf()) === 2, await scoreOf());
  const parallel = await Promise.all(Array.from({ length: 10 }, () => vote(-1)));
  check("10 parallel downvotes from one user count once (score = 0)", parallel.every((r) => r.status === 200) && (await scoreOf()) === 0, await scoreOf());

  console.log("\nCascading delete");
  const deleted = await call("DELETE", `/community/${communityId}`, { token });
  check("community delete succeeds (200)", deleted.status === 200, deleted);
  const gone = await call("GET", `/post/${postId}`);
  check("the community's post was deleted with it (404)", gone.status === 404, gone);
  const [leftoverVotes] = await Client.query<{ n: number }>("SELECT COUNT(*) AS n FROM PostVotes WHERE post_id = :postId", {
    type: QueryTypes.SELECT,
    replacements: { postId },
  });
  check("the post's votes were deleted with it", Number(leftoverVotes?.n) === 0, leftoverVotes);

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
