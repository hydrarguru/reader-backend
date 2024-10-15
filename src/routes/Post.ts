import express from "express";
import { getAll, getOne, insertOne } from "../db/database";
import { validateUUID, validateScore } from "../util/validate";
import type { Post } from "../types/PostType";
import { setPostScore } from "../functions/postFunctions";

export const PostRouter = express.Router();

/**
 * @openapi
 * /posts:
 *   get:
 *     tags: [Post]
 *     description: Get all posts
 *     responses:
 *       200:
 *         description: Returns all posts
 */
PostRouter.get("/posts", async (req, res) => {
    const posts = await getAll("Posts");
    res.send(posts);
});

/**
 * @openapi
 * /post/{id}:
 *   get:
 *     tags: [Post]
 *     description: Get a post by id
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: UUID of the post
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Returns the post
 *       400:
 *         description: Invalid UUID
 *       404:
 *         description: Post not found
 */
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

/**
 * @openapi
 * /c/{community_id}/posts:
 *   get:
 *     tags: [Post]
 *     description: Get all posts in a community
 *     parameters:
 *       - in: path
 *         name: community_id
 *         required: true
 *         description: UUID of the community
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Returns all posts in the community
 */
PostRouter.get('/c/:community_id/posts', async (req, res) => {
    const community_id = req.params.community_id;
    const posts = await getAll('Posts') as Post[];
    const communityPosts = posts.filter((post) => post.community_id === community_id); 
    res.status(201).send(communityPosts);
});

/**
 * @openapi
 * /post/create:
 *   post:
 *     tags: [Post]
 *     description: Create a post
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               community_id:
 *                 type: string
 *               post_author:
 *                 type: string
 *               post_title:
 *                 type: string
 *               post_image_url:
 *                 type: string
 *               post_content:
 *                 type: string
 *     responses:
 *       201:
 *         description: Post created
 *       500:
 *         description: Error creating post
 */
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

/**
 * @openapi
 * /post/{post_id}/{score}:
 *   post:
 *     tags: [Post]
 *     description: Update a post's score
 *     parameters:
 *       - in: path
 *         name: post_id
 *         required: true
 *         description: UUID of the post
 *         schema:
 *           type: string
 *       - in: path
 *         name: score
 *         required: true
 *         description: Score to update
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Post score updated
 *       400:
 *         description: Invalid UUID or score
 *       500:
 *         description: Error updating post score
 */
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