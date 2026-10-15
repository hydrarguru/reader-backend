import type { Post } from '../types/PostType.js'
import type { PostVote } from '../types/PostVoteType.js'
import { and, eq, getTableColumns, sql } from 'drizzle-orm'
import { db } from '../db/database.js'
import { posts, postVotes } from '../db/schema.js'

// Selects posts along with how many comments each one has.
// COUNT can come back as a string from the MySQL driver, so mapWith makes sure clients always get a number.
function selectPostsWithCommentCount() {
    return db.select({
        ...getTableColumns(posts),
        comment_count: sql<number>`(SELECT COUNT(*) FROM Comments WHERE Comments.post_id = Posts.post_id)`.mapWith(Number),
    }).from(posts);
}

export async function getPosts(communityId?: string): Promise<Post[]> {
    const where = communityId === undefined ? undefined : eq(posts.community_id, communityId);
    return selectPostsWithCommentCount().where(where).limit(100);
}

export async function getPost(postId: string): Promise<Post | null> {
    const [post] = await selectPostsWithCommentCount().where(eq(posts.post_id, postId));
    return post ?? null;
}

export async function postExists(postId: string): Promise<boolean> {
    const [post] = await db.select({ post_id: posts.post_id }).from(posts).where(eq(posts.post_id, postId));
    return post !== undefined;
}

export async function createPost(newPost: Post) {
    await db.insert(posts).values({
        post_id: newPost.post_id,
        community_id: newPost.community_id,
        post_author: newPost.post_author,
        post_title: newPost.post_title,
        post_image_url: newPost.post_image_url,
        post_content: newPost.post_content,
        post_score: newPost.post_score,
    });
    console.log('Post created');
    console.table(newPost);
}

export async function deletePost(postId: string) {
    if (await postExists(postId)) {
        await db.delete(posts).where(eq(posts.post_id, postId));
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
    return db.transaction(async (tx) => {
        // Locking the post row serialises concurrent votes on it, so double clicks can't double count.
        const [post] = await tx.select({ post_score: posts.post_score }).from(posts)
            .where(eq(posts.post_id, postId))
            .for('update');
        if (post === undefined) {
            return null;
        }
        const thisVote = and(eq(postVotes.post_id, postId), eq(postVotes.user_id, userId));
        const [existing] = await tx.select({ vote: postVotes.vote }).from(postVotes).where(thisVote);
        const score = post.post_score ?? 0;
        const previousVote = existing?.vote ?? 0;
        const delta = vote - previousVote;
        if (delta === 0) {
            return score;
        }
        if (vote === 0) {
            await tx.delete(postVotes).where(thisVote);
        } else {
            await tx.insert(postVotes).values({ post_id: postId, user_id: userId, vote })
                .onDuplicateKeyUpdate({ set: { vote } });
        }
        await tx.update(posts).set({ post_score: sql`${posts.post_score} + ${delta}` })
            .where(eq(posts.post_id, postId));
        return score + delta;
    });
}

export async function getUserVotes(userId: string): Promise<PostVote[]> {
    // The vote column's CHECK constraint only allows 1 and -1.
    return db.select({ post_id: postVotes.post_id, vote: postVotes.vote }).from(postVotes)
        .where(eq(postVotes.user_id, userId)) as Promise<PostVote[]>;
}

export async function editPost(postId: string, editedPost: Post) {
    if (await postExists(postId)) {
        await db.update(posts).set({ post_title: editedPost.post_title }).where(eq(posts.post_id, postId));
        console.log('Post edited');
    }
    else {
        console.error('Could not edit post.');
    }
}
