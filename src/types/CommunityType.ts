export type CommunityRule = {
  rule_title: string;
  rule_desc: string;
};

export type Community = {
  community_id: string | undefined;
  community_name: string;
  community_image_url?: string | undefined;
  community_desc: string;
  community_rules?: CommunityRule[];
  created_at?: Date;
  modified_at?: Date;
};
