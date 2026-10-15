export type Post = {
    post_id: string,
    community_id: string,
    post_author: string,
    post_title: string,
    post_image_url?: string | null,
    post_content: string,
    post_score: number | null,
    comment_count?: number,
    created_at?: Date | null,
    modified_at?: Date | null
};
