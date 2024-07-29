import type { User } from '../types/UserType'
import { insertOne, checkForDuplicate, deleteOne, updateOne, checkIfExists } from '../db'

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