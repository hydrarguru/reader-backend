import { eq } from 'drizzle-orm'
import type { OmittedUser, User } from '../types/UserType.js'
import { db } from '../db/database.js'
import { users } from '../db/schema.js'
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
    await db.insert(users).values(user);
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
    return db.select(publicColumns).from(users).limit(100);
};

export async function editUser(userId: string, editedUser: User) {
    if(await userExists(users.user_id, userId)) {
        await db.update(users).set({
            username: editedUser.username,
            password: await hashPassword(editedUser.password),
            email: editedUser.email,
        }).where(eq(users.user_id, userId));
    }
    else {
        console.error('User does not exist.');
    }
};

export async function deleteUser(userId: string) {
    if(await userExists(users.user_id, userId)) {
        await db.delete(users).where(eq(users.user_id, userId));
        console.log('User deleted');
    }
    else {
        console.error('Could not delete user.');
    }
};
