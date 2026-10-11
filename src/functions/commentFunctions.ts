import type { Comment } from '../types/CommentsType.js'
import { QueryTypes } from 'sequelize'
import { Client, checkIfExists, deleteOne, getOne, insertOne } from '../db/database.js'

export const MAX_COMMENT_LENGTH = 255;

// Returns the post's comments oldest first, or null if the post doesn't exist.
export async function getPostComments(postId: string): Promise<Comment[] | null> {
    if (!(await checkIfExists('Posts', 'post_id', postId))) {
        return null;
    }
    return Client.query<Comment>('SELECT * FROM Comments WHERE post_id = :postId ORDER BY created_at ASC, comment_id ASC', {
        type: QueryTypes.SELECT,
        replacements: { postId }
    });
}

// Returns the stored comment (with its timestamps), or null if the post doesn't exist.
export async function createComment(postId: string, author: string, content: string): Promise<Comment | null> {
    if (!(await checkIfExists('Posts', 'post_id', postId))) {
        return null;
    }
    const newComment: Comment = {
        comment_id: crypto.randomUUID(),
        post_id: postId,
        comment_author: author,
        comment_content: content,
    };
    await insertOne('Comments', newComment);
    return (await getOne('Comments', 'comment_id', newComment.comment_id)) as Comment;
}

export async function getComment(commentId: string): Promise<Comment | null> {
    return (await getOne('Comments', 'comment_id', commentId)) as Comment | null;
}

export async function deleteComment(commentId: string): Promise<void> {
    await deleteOne('Comments', 'comment_id', commentId);
}
