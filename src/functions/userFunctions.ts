import type { OmittedUser, User } from '../types/UserType'
import { insertOne, checkForDuplicate, deleteOne, updateOne, checkIfExists, getOne, getAll } from '../db/database'

export async function createUser(newUser: User) {
    if(await checkForDuplicate('Users', 'username', newUser.username)) {
        console.error('Username already exists.');
    }
    if(await checkForDuplicate('Users', 'email', newUser.email)) {
        console.error('There is already an account associated with this email.');
    }
    else {
        await insertOne('Users', newUser);
        console.log('User created');
        console.table(newUser);
    }
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
        await updateOne('Users', 'user_id', userId, 'password', editedUser.password);
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