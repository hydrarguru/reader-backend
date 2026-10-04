import type { OmittedUser, User } from '../types/UserType.js'
import { insertOne, checkForDuplicate, deleteOne, updateOne, checkIfExists, getOne, getAll } from '../db/database.js'
import { hashPassword, verifyPassword } from './authFunctions.js'

export type CreateUserResult = { ok: true, user: OmittedUser } | { ok: false, reason: string };

export async function createUser(newUser: User): Promise<CreateUserResult> {
    if(await checkForDuplicate('Users', 'username', newUser.username)) {
        return { ok: false, reason: 'Username already exists.' };
    }
    if(await checkForDuplicate('Users', 'email', newUser.email)) {
        return { ok: false, reason: 'There is already an account associated with this email.' };
    }
    const user: User = { ...newUser, password: await hashPassword(newUser.password) };
    await insertOne('Users', user);
    console.log(`User created: ${user.username}`);
    const { email, password, created_at, modified_at, ...omittedUser } = user;
    return { ok: true, user: omittedUser };
};

// Returns the user's id if the username/password pair is valid, otherwise null.
export async function authenticateUser(username: string, password: string): Promise<string | null> {
    const user = await getOne('Users', 'username', username) as User | null;
    if (!user || !user.user_id || !(await verifyPassword(password, user.password))) {
        return null;
    }
    return user.user_id;
};

export async function getUser(userId: string): Promise<OmittedUser | null> {
    if(await checkIfExists('Users', 'user_id', userId)) {
        const user = await getOne('Users', 'user_id', userId) as User;
        const { email, password, created_at, modified_at, ...omittedUser } = user;
        return omittedUser;
    }
    else {
        console.error(`User with id: ${userId} does not exist.`);
        return null;
    }
};

export async function getAllUsers(): Promise<OmittedUser[]> {
    const users = await getAll('Users') as User[];
    return users.map(({ email, password, created_at, modified_at, ...user }) => user);
};

export async function editUser(userId: string, editedUser: User) {
    if(await checkIfExists('Users', 'user_id', userId)) {
        await updateOne('Users', 'user_id', userId, 'username', editedUser.username);
        await updateOne('Users', 'user_id', userId, 'password', await hashPassword(editedUser.password));
        await updateOne('Users', 'user_id', userId, 'email', editedUser.email);
    }
    else {
        console.error('User does not exist.');
    }
};

export async function deleteUser(userId: string) {
    if(await checkIfExists('Users', 'user_id', userId)) {
        await deleteOne('Users', 'user_id', userId);
        console.log('User deleted');
    }
    else {
        console.error('Could not delete user.');
    }
};  