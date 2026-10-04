import type { Post } from '../types/PostType.js'
import type { PostVote } from '../types/PostVoteType.js'
import { QueryTypes } from 'sequelize'
import { Client, insertOne, deleteOne, checkIfExists, updateOne } from '../db/database.js'

export async function createPost(newPost: Post) {
    await insertOne('Posts', newPost);
    console.log('Post created');
    console.table(newPost);    
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

// Sets the user's vote on a post (1 = upvote, -1 = downvote, 0 = remove vote) and adjusts
// the post's score by the difference from their previous vote, so each user counts at most once.
// Returns the post's new score, or null if the post doesn't exist.
export async function votePost(postId: string, userId: string, vote: -1 | 0 | 1): Promise<number | null> {
    return Client.transaction(async (transaction) => {
        // Locking the post row serialises concurrent votes on it, so double clicks can't double count.
        const [post] = await Client.query<{ post_score: number }>(
            'SELECT post_score FROM Posts WHERE post_id = :postId FOR UPDATE',
            { type: QueryTypes.SELECT, replacements: { postId }, transaction }
        );
        if (post === undefined) {
            return null;
        }
        const [existing] = await Client.query<{ vote: number }>(
            'SELECT vote FROM PostVotes WHERE post_id = :postId AND user_id = :userId',
            { type: QueryTypes.SELECT, replacements: { postId, userId }, transaction }
        );
        const previousVote = existing?.vote ?? 0;
        const delta = vote - previousVote;
        if (delta === 0) {
            return post.post_score;
        }
        if (vote === 0) {
            await Client.query('DELETE FROM PostVotes WHERE post_id = :postId AND user_id = :userId', {
                replacements: { postId, userId }, transaction
            });
        } else {
            await Client.query(
                'INSERT INTO PostVotes (post_id, user_id, vote) VALUES (:postId, :userId, :vote) ON DUPLICATE KEY UPDATE vote = :vote',
                { replacements: { postId, userId, vote }, transaction }
            );
        }
        await Client.query('UPDATE Posts SET post_score = post_score + :delta WHERE post_id = :postId', {
            replacements: { postId, delta }, transaction
        });
        return post.post_score + delta;
    });
}

export async function getUserVotes(userId: string): Promise<PostVote[]> {
    return Client.query<PostVote>('SELECT post_id, vote FROM PostVotes WHERE user_id = :userId', {
        type: QueryTypes.SELECT,
        replacements: { userId }
    });
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