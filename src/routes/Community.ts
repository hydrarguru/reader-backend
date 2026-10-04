import express from "express";
import { getAll, getOne } from "../db/database.js";
import { validateCommunityName, validateUUID } from "../util/validate.js";
import {
  createCommunity,
  deleteCommunity,
} from "../functions/communityFunctions.js";
import type { Community } from "../types/CommunityType.js";
import { requireAuth } from "../functions/authFunctions.js";

export const CommunityRouter = express.Router();

/**
 * @openapi
 * /community/all:
 *   get:
 *     tags: [Community]
 *     description: Get all communities (at most 100).
 *     responses:
 *       200:
 *         description: List of communities.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Community'
 */
CommunityRouter.get("/community/all", async (req, res) => {
  const communities = await getAll("Communities");
  res.status(200).send(communities);
});

/**
 * @openapi
 * /community/{name}:
 *   get:
 *     tags: [Community]
 *     description: Get a community by name.
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         description: Name of the community (letters and underscores, 1-20 characters)
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: The community.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 community:
 *                   $ref: '#/components/schemas/Community'
 *       400:
 *         description: Invalid community name (plain text).
 *       404:
 *         description: Community not found (plain text).
 */
CommunityRouter.get("/community/:name", async (req, res) => {
  const name = req.params.name;
  if (!validateCommunityName(name)) {
    res.status(400).send("Invalid community name.");
    return;
  } else {
    const community = await getOne("Communities", "community_name", name);
    if (community === null) {
      res.status(404).send("Community not found.");
      return;
    } else {
      res.send({ community: community });
    }
  }
});

/**
 * @openapi
 * /community/create:
 *   post:
 *     tags: [Community]
 *     description: Create a community. Responds with plain text.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [community_name, community_desc]
 *             properties:
 *               community_name:
 *                 type: string
 *                 description: Letters and underscores, 1-20 characters.
 *               community_desc:
 *                 type: string
 *               community_image_url:
 *                 type: string
 *               community_id:
 *                 type: string
 *                 format: uuid
 *                 description: Optional. Generated if omitted or not a valid UUID.
 *     responses:
 *       201:
 *         description: Community created. The text includes the created community as JSON.
 *       400:
 *         description: Name missing, invalid or already taken, or description missing.
 *       401:
 *         description: Missing or invalid token.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
 *       500:
 *         description: Error creating community.
 */
CommunityRouter.post("/community/create", requireAuth, async (req, res) => {
  const { community_id, community_name, community_desc, community_image_url } = req.body ?? {};
  if (!community_name || !validateCommunityName(community_name)) {
    res.status(400).send("Community name not provided or invalid.");
    return;
  }
  if (!community_desc) {
    res.status(400).send("Community description not provided.");
    return;
  }
  // Only known fields are copied: insertOne uses the object's keys as column names.
  const newCommunity: Community = {
    community_id: community_id && validateUUID(community_id) ? community_id : crypto.randomUUID(),
    community_name: community_name,
    community_desc: community_desc,
    community_image_url: community_image_url,
  };
  try {
    if (await createCommunity(newCommunity)) {
      res.status(201).send("Community created: " + JSON.stringify(newCommunity));
    } else {
      res.status(400).send("Community name already exists.");
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Error creating community.");
  }
});

/**
 * @openapi
 * /community/{id}:
 *   delete:
 *     tags: [Community]
 *     description: Delete a community by ID. Its posts (and their comments) are deleted too. Responds with plain text.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: UUID of the community
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Community deleted.
 *       400:
 *         description: Invalid community ID.
 *       401:
 *         description: Missing or invalid token.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
 *       500:
 *         description: Error deleting community.
 */
CommunityRouter.delete("/community/:id", requireAuth, async (req, res) => {
  const id = req.params.id;
  if (!validateUUID(id)) {
    res.status(400).send("Invalid community ID.");
    return;
  }
  try {
    await deleteCommunity(id);
    res.send("Community deleted.");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error deleting community.");
  }
});
