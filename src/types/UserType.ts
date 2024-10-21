export type User = {
    user_id?: string;
    username: string;
    password: string;
    email: string;
    created_at?: string;
    modified_at?: string;
};

export type OmittedUser = Omit<User, 'email' | 'password' | 'created_at' | 'modified_at'>;
