export type Comment = {
    comment_id: string;
    post_id: string;
    comment_author: string;
    comment_content: string;
    created_at?: Date;
    modified_at?: Date;
};