import type { Post } from '../types/PostType'
import { insertOne, deleteOne, checkIfExists, updateOne, Client } from '../db'

export async function createPost(newPost: Post) {
    await insertOne('Posts', newPost);
    console.log('Post created');
    console.table(newPost);    
}

export async function createPostByCommunityName(table: string, communityName: string, newPost: Post) {
    const columns = Object.keys(newPost).join(', ');
    const values = Object.values(newPost).join("', '");
    console.log(Client.query(`INSERT INTO ${table} (${columns}) VALUES ('${values}' WHERE community_name = :communityName`, {
        replacements: { communityName: communityName}
    }));
}

export async function deletePost(postId: string) {
    if (await checkIfExists('Posts', 'post_id', postId)) {
        await deleteOne('Posts', 'post_id', postId);
        console.log('Post deleted');
    }
    else {
        console.error('Could not delete post.');
    }
}

export async function setPostScore(postId: string, score: number): Promise<boolean> {
    if (await checkIfExists('Posts', 'post_id', postId)) {
        await updateOne('Posts', 'post_id', postId, 'post_score', score);
        return true;
    }
    else {
        console.error('Could not update post score.');
        return false;
    }
}

export async function editPost(postId: string, editedPost: Post) {
    if (await checkIfExists('Posts', 'post_id', postId)) {
        await updateOne('Posts', 'post_id', postId, 'post_title', editedPost.post_title);
        console.log('Post edited');
    }
    else {
        console.error('Could not edit post.');
    }
}