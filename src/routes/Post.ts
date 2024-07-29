import express from "express";
import { getAll, getOne, insertOne } from "../db";
import { validateUUID, validateScore } from "../util/validate";
import type { Post } from "../types/PostType";
import { setPostScore } from "../functions/postFunctions";
//import { createPostByCommunityName } from "../functions/postFunctions";

export const PostRouter = express.Router();

//Get all posts
PostRouter.get("/posts", async (req, res) => {
    const posts = await getAll("Posts");
    res.send(posts);
});

//Get post by ID
PostRouter.get("/post/:id", async (req, res) => {
    const id = req.params.id;

    if(!validateUUID(id)) {
        res.status(400).send("Invalid UUID.");
        return;
    }
    else {
        const post = await getOne("Posts", "post_id", id);
        if (post === null) {
            res.status(404).send("Post not found.");
            return;
        }
        else {
            res.send({post: post});
        }
    }
});

//Get all community specific posts
PostRouter.get('/c/:community_id/posts', async (req, res) => {
    const community_id = req.params.community_id;
    const posts = await getAll('Posts') as Post[];
    const communityPosts = posts.filter((post) => post.community_id === community_id); 
    res.status(201).send(communityPosts);
});

//Create post
PostRouter.post("/post/create", async (req, res) => {
    const newPost : Post = {
        post_id: crypto.randomUUID(),
        community_id: req.body.community_id,
        post_author: req.body.post_author,
        post_title: req.body.post_title,
        post_image_url: req.body.post_image_url,
        post_content: req.body.post_content,
        post_score: 0
    };

    await insertOne('Posts', newPost).catch((err) => {
        console.error(err);
        res.status(500).send({
            message: 'Error creating post.',
            error: err
        });
    }).finally(() => {
        res.status(201).send({ message: 'Post created.', post: newPost });
    });
});

PostRouter.post('/post/:post_id/:score', async (req, res) => {
    if(!validateUUID(req.params.post_id)) {
        res.status(400).send('Invalid post UUID.');
        return;
    }
    if(!validateScore(Number(req.params.score))) {
        res.status(400).send('Invalid score.');
        return;
    }
    const postId = req.params.post_id;
    const score = Number(req.params.score);
    await setPostScore(postId, score).then((result) => {
        if(result) {
            res.status(200).send({ message: 'Post score updated.' });
        }
        else {
            res.status(400).send({ message: 'Error updating post score.' });
        }
    }).catch((err) => {
        res.status(500).send({ message: 'Error updating post score.', error: err });
    });
});

//PostRouter.post("/c/:community_name/create", async (req, res) => {
//    const newPost : Post = {
//        post_id: crypto.randomUUID(),
//        post_author: req.body.post_author,
//        post_title: req.body.post_title,
//        post_image_url: '',
//        post_content: req.body.post_content,
//        post_score: 0
//    };
//    await createPostByCommunityName('Posts', req.params.community_name, newPost);
//    res.send({ message: 'Post created.', post: newPost });
//});