import type { Comment } from '../types/CommentsType.js'
import { asc, eq } from 'drizzle-orm'
import { db } from '../db/database.js'
import { comments } from '../db/schema.js'
import { postExists } from './postFunctions.js'

export const MAX_COMMENT_LENGTH = 255;

// Returns the post's comments oldest first, or null if the post doesn't exist.
export async function getPostComments(postId: string): Promise<Comment[] | null> {
    if (!(await postExists(postId))) {
        return null;
    }
    return db.select().from(comments)
        .where(eq(comments.post_id, postId))
        .orderBy(asc(comments.created_at), asc(comments.comment_id));
}

// Returns the stored comment (with its timestamps), or null if the post doesn't exist.
export async function createComment(postId: string, author: string, content: string): Promise<Comment | null> {
    if (!(await postExists(postId))) {
        return null;
    }
    const comment_id = crypto.randomUUID();
    await db.insert(comments).values({
        comment_id,
        post_id: postId,
        comment_author: author,
        comment_content: content,
    });
    return getComment(comment_id);
}

export async function getComment(commentId: string): Promise<Comment | null> {
    const [comment] = await db.select().from(comments).where(eq(comments.comment_id, commentId));
    return comment ?? null;
}

export async function deleteComment(commentId: string): Promise<void> {
    await db.delete(comments).where(eq(comments.comment_id, commentId));
}

// Returns the updated comment, or null if it doesn't exist.
export async function updateComment(commentId: string, content: string): Promise<Comment | null> {
    await db.update(comments).set({ comment_content: content }).where(eq(comments.comment_id, commentId));
    return getComment(commentId);
}
