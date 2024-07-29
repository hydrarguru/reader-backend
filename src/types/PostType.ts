export type Post = {
    post_id: string,
    community_id?: string,
    post_author?: string,
    post_title: string,
    post_image_url?: string,
    post_content: string,
    post_score: number,
    created_at?: Date,
    modified_at?: Date
};