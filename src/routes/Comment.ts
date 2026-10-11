import express from "express";
import { validateUUID } from "../util/validate.js";
import { requireAuth } from "../functions/authFunctions.js";
import { getUser } from "../functions/userFunctions.js";
import {
  MAX_COMMENT_LENGTH,
  createComment,
  deleteComment,
  getComment,
  getPostComments,
} from "../functions/commentFunctions.js";

export const CommentRouter = express.Router();

/**
 * @openapi
 * /post/{post_id}/comments:
 *   get:
 *     tags: [Comment]
 *     description: Get a post's comments, oldest first.
 *     parameters:
 *       - in: path
 *         name: post_id
 *         required: true
 *         description: UUID of the post
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: The post's comments (empty if none).
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Comment'
 *       400:
 *         description: Invalid UUID.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
 *       404:
 *         description: Post not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
 *       500:
 *         description: Error fetching comments.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
 */
CommentRouter.get("/post/:post_id/comments", async (req, res) => {
  const postId = req.params.post_id;
  if (!validateUUID(postId)) {
    res.status(400).send({ message: "Invalid post UUID." });
    return;
  }
  try {
    const comments = await getPostComments(postId);
    if (comments === null) {
      res.status(404).send({ message: "Post not found." });
      return;
    }
    res.send(comments);
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Error fetching comments." });
  }
});

/**
 * @openapi
 * /post/{post_id}/comments:
 *   post:
 *     tags: [Comment]
 *     description: Comment on a post. The author is the logged-in user.
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [comment_content]
 *             properties:
 *               comment_content:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 255
 *                 description: Trimmed before saving; must not be empty after trimming.
 *     responses:
 *       201:
 *         description: Comment created.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 comment:
 *                   $ref: '#/components/schemas/Comment'
 *       400:
 *         description: Invalid UUID or comment_content.
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
 *       404:
 *         description: Post not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
 *       500:
 *         description: Error creating comment.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
 */
CommentRouter.post("/post/:post_id/comments", requireAuth, async (req, res) => {
  const postId = req.params.post_id;
  const rawContent = req.body?.comment_content;
  const content = typeof rawContent === "string" ? rawContent.trim() : "";
  if (!validateUUID(postId)) {
    res.status(400).send({ message: "Invalid post UUID." });
    return;
  }
  if (content.length === 0 || content.length > MAX_COMMENT_LENGTH) {
    res.status(400).send({ message: `comment_content must be 1 to ${MAX_COMMENT_LENGTH} characters.` });
    return;
  }
  try {
    const author = await getUser(res.locals.userId);
    if (author === null) {
      res.status(401).send({ message: "User no longer exists." });
      return;
    }
    const comment = await createComment(postId, author.username, content);
    if (comment === null) {
      res.status(404).send({ message: "Post not found." });
      return;
    }
    res.status(201).send({ message: "Comment created.", comment: comment });
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Error creating comment." });
  }
});

/**
 * @openapi
 * /comment/{comment_id}:
 *   delete:
 *     tags: [Comment]
 *     description: Delete a comment. Only its author can delete it.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: comment_id
 *         required: true
 *         description: UUID of the comment
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Comment deleted.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
 *       400:
 *         description: Invalid UUID.
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
 *       403:
 *         description: The comment belongs to someone else.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
 *       404:
 *         description: Comment not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
 *       500:
 *         description: Error deleting comment.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
 */
CommentRouter.delete("/comment/:comment_id", requireAuth, async (req, res) => {
  const commentId = req.params.comment_id;
  if (!validateUUID(commentId)) {
    res.status(400).send({ message: "Invalid comment UUID." });
    return;
  }
  try {
    const user = await getUser(res.locals.userId);
    if (user === null) {
      res.status(401).send({ message: "User no longer exists." });
      return;
    }
    const comment = await getComment(commentId);
    if (comment === null) {
      res.status(404).send({ message: "Comment not found." });
      return;
    }
    if (comment.comment_author !== user.username) {
      res.status(403).send({ message: "You can only delete your own comments." });
      return;
    }
    await deleteComment(commentId);
    res.send({ message: "Comment deleted." });
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Error deleting comment." });
  }
});
