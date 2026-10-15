export type Comment = {
    comment_id: string;
    post_id: string;
    comment_author: string;
    comment_content: string;
    comment_score?: number | null;
    created_at?: Date | null;
    modified_at?: Date | null;
};
