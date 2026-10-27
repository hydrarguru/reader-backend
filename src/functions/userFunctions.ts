import { and, asc, eq, ne, sql } from 'drizzle-orm'
import type { OmittedUser, User } from '../types/UserType.js'
import { db } from '../db/database.js'
import { comments, posts, users } from '../db/schema.js'
import { hashPassword, verifyPassword } from './authFunctions.js'

export type CreateUserResult = { ok: true, user: OmittedUser } | { ok: false, reason: string };

// The fields that are safe to send to clients.
const publicColumns = { user_id: users.user_id, username: users.username };

async function userExists(column: typeof users.user_id | typeof users.username | typeof users.email, value: string): Promise<boolean> {
    const [user] = await db.select({ user_id: users.user_id }).from(users).where(eq(column, value)).limit(1);
    return user !== undefined;
}

export async function createUser(newUser: User): Promise<CreateUserResult> {
    if(await userExists(users.username, newUser.username)) {
        return { ok: false, reason: 'Username already exists.' };
    }
    if(await userExists(users.email, newUser.email)) {
        return { ok: false, reason: 'There is already an account associated with this email.' };
    }
    const user = {
        user_id: newUser.user_id ?? crypto.randomUUID(),
        username: newUser.username,
        password: await hashPassword(newUser.password),
        email: newUser.email,
    };
    try {
        await db.insert(users).values(user);
    } catch (error) {
        // Two sign-ups with the same name or email can both pass the checks above; the unique index stops the second.
        if ((error as { cause?: { code?: string } }).cause?.code === 'ER_DUP_ENTRY') {
            return { ok: false, reason: 'Username or email already exists.' };
        }
        throw error;
    }
    console.log(`User created: ${user.username}`);
    return { ok: true, user: { user_id: user.user_id, username: user.username } };
};

// Returns the user's id if the username/password pair is valid, otherwise null.
export async function authenticateUser(username: string, password: string): Promise<string | null> {
    const [user] = await db.select({ user_id: users.user_id, password: users.password }).from(users).where(eq(users.username, username));
    if (!user || !(await verifyPassword(password, user.password))) {
        return null;
    }
    return user.user_id;
};

export async function getUser(userId: string): Promise<OmittedUser | null> {
    const [user] = await db.select(publicColumns).from(users).where(eq(users.user_id, userId));
    if (user === undefined) {
        console.error(`User with id: ${userId} does not exist.`);
        return null;
    }
    return user;
};

export async function getAllUsers(): Promise<OmittedUser[]> {
    return db.select(publicColumns).from(users).orderBy(asc(users.username)).limit(100);
};

export type UserChanges = { username?: string, email?: string, password?: string };
export type UpdateUserResult = { ok: true, user: OmittedUser } | { ok: false, status: 404 | 409, reason: string };

// True if someone other than userId already uses this username or email.
async function takenByOtherUser(column: typeof users.username | typeof users.email, value: string, userId: string): Promise<boolean> {
    const [user] = await db.select({ user_id: users.user_id }).from(users).where(and(eq(column, value), ne(users.user_id, userId))).limit(1);
    return user !== undefined;
}

export async function verifyUserPassword(userId: string, password: string): Promise<boolean> {
    const [user] = await db.select({ password: users.password }).from(users).where(eq(users.user_id, userId));
    return user !== undefined && (await verifyPassword(password, user.password));
}

// Applies the given changes; fields left out stay as they are. A new username carries over to the
// user's posts and comments through the foreign keys' ON UPDATE CASCADE.
export async function updateUser(userId: string, changes: UserChanges): Promise<UpdateUserResult> {
    if (!(await userExists(users.user_id, userId))) {
        return { ok: false, status: 404, reason: 'User not found.' };
    }
    if (changes.username !== undefined && await takenByOtherUser(users.username, changes.username, userId)) {
        return { ok: false, status: 409, reason: 'Username already exists.' };
    }
    if (changes.email !== undefined && await takenByOtherUser(users.email, changes.email, userId)) {
        return { ok: false, status: 409, reason: 'There is already an account associated with this email.' };
    }
    // Drizzle leaves undefined fields out of the SET clause.
    await db.update(users).set({
        username: changes.username,
        email: changes.email,
        password: changes.password === undefined ? undefined : await hashPassword(changes.password),
    }).where(eq(users.user_id, userId));
    console.log(`User updated: ${userId}`);
    return { ok: true, user: (await getUser(userId))! };
};

// Deletes the user with their posts and comments. Their votes are taken back out of the scores
// of the posts that remain. Returns false if the user doesn't exist.
export async function deleteUser(userId: string): Promise<boolean> {
    return db.transaction(async (tx) => {
        const [user] = await tx.select({ username: users.username }).from(users)
            .where(eq(users.user_id, userId))
            .for('update');
        if (user === undefined) {
            return false;
        }
        await tx.execute(sql`
            UPDATE Posts JOIN PostVotes ON PostVotes.post_id = Posts.post_id
            SET Posts.post_score = Posts.post_score - PostVotes.vote
            WHERE PostVotes.user_id = ${userId}`);
        // Posts and comments point at the username without ON DELETE CASCADE, so they go first.
        // Deleting the posts also deletes their comments and votes; PostVotes and Admins rows cascade from Users.
        await tx.delete(comments).where(eq(comments.comment_author, user.username));
        await tx.delete(posts).where(eq(posts.post_author, user.username));
        await tx.delete(users).where(eq(users.user_id, userId));
        console.log(`User deleted: ${user.username}`);
        return true;
    });
};
