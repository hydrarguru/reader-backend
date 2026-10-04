import express from "express";
import { getAll, getOne, insertOne } from "../db/database.js";
import { validateUUID, validateScore } from "../util/validate.js";
import type { Post } from "../types/PostType.js";
import { setPostScore } from "../functions/postFunctions.js";
import { requireAuth } from "../functions/authFunctions.js";
import { getUser } from "../functions/userFunctions.js";

export const PostRouter = express.Router();

/**
 * @openapi
 * /post/all:
 *   get:
 *     tags: [Post]
 *     description: Get all posts from every community (at most 100).
 *     responses:
 *       200:
 *         description: List of posts.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Post'
 */
PostRouter.get("/post/all", async (req, res) => {
  const posts = await getAll("Posts");
  res.send(posts);
});

/**
 * @openapi
 * /post/{id}:
 *   get:
 *     tags: [Post]
 *     description: Get a post by ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: UUID of the post
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: The post.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 post:
 *                   $ref: '#/components/schemas/Post'
 *       400:
 *         description: Invalid UUID (plain text).
 *       404:
 *         description: Post not found (plain text).
 */
PostRouter.get("/post/:id", async (req, res) => {
  const id = req.params.id;

  if (!validateUUID(id)) {
    res.status(400).send("Invalid UUID.");
    return;
  } else {
    const post = await getOne("Posts", "post_id", id);
    if (post === null) {
      res.status(404).send("Post not found.");
      return;
    } else {
      res.send({ post: post });
    }
  }
});

/**
 * @openapi
 * /community/{community_id}/post/all:
 *   get:
 *     tags: [Post]
 *     description: Get all posts in a community.
 *     parameters:
 *       - in: path
 *         name: community_id
 *         required: true
 *         description: UUID of the community
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: List of posts in the community (empty if none).
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Post'
 */
PostRouter.get("/community/:community_id/post/all", async (req, res) => {
  const community_id = req.params.community_id;
  const posts = (await getAll("Posts")) as Post[];
  const communityPosts = posts.filter(
    (post) => post.community_id === community_id
  );
  res.status(200).send(communityPosts);
});

/**
 * @openapi
 * /post/create:
 *   post:
 *     tags: [Post]
 *     description: Create a post. The author is the logged-in user.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [community_id, post_title, post_content]
 *             properties:
 *               community_id:
 *                 type: string
 *                 format: uuid
 *               post_title:
 *                 type: string
 *               post_image_url:
 *                 type: string
 *               post_content:
 *                 type: string
 *     responses:
 *       201:
 *         description: Post created.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 post:
 *                   $ref: '#/components/schemas/Post'
 *       400:
 *         description: Missing required fields.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
 *       401:
 *         description: Missing or invalid token.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
 *       500:
 *         description: Error creating post.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
 */
PostRouter.post("/post/create", requireAuth, async (req, res) => {
  const { community_id, post_title, post_image_url, post_content } = req.body ?? {};
  if (!community_id || !post_title || !post_content) {
    res.status(400).send({ message: "community_id, post_title and post_content are required." });
    return;
  }
  try {
    const author = await getUser(res.locals.userId);
    if (author === null) {
      res.status(401).send({ message: "User no longer exists." });
      return;
    }
    const newPost: Post = {
      post_id: crypto.randomUUID(),
      community_id: community_id,
      post_author: author.username,
      post_title: post_title,
      post_image_url: post_image_url,
      post_content: post_content,
      post_score: 0,
    };
    await insertOne("Posts", newPost);
    res.status(201).send({ message: "Post created.", post: newPost });
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Error creating post." });
  }
});

/**
 * @openapi
 * /post/{post_id}/{score}:
 *   post:
 *     tags: [Post]
 *     description: Set a post's score.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: post_id
 *         required: true
 *         description: UUID of the post
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: score
 *         required: true
 *         description: New score (non-negative integer)
 *         schema:
 *           type: integer
 *           minimum: 0
 *     responses:
 *       204:
 *         description: Score updated.
 *       400:
 *         description: Invalid UUID or score (plain text), or post not found (JSON message).
 *       401:
 *         description: Missing or invalid token.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
 *       500:
 *         description: Error updating post score.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
 */
PostRouter.post("/post/:post_id/:score", requireAuth, async (req, res) => {
  if (!validateUUID(req.params.post_id)) {
    res.status(400).send("Invalid post UUID.");
    return;
  }
  if (!validateScore(Number(req.params.score))) {
    res.status(400).send("Invalid score.");
    return;
  }
  const postId = req.params.post_id;
  const score = Number(req.params.score);
  await setPostScore(postId, score)
    .then((result) => {
      if (result) {
        res.status(204).send();
      } else {
        res.status(400).send({ message: "Error updating post score." });
      }
    })
    .catch((err) => {
      res
        .status(500)
        .send({ message: "Error updating post score." });
    });
});
