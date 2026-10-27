import express from "express";
import { validateCommunityChanges, validateCommunityName, validateUUID } from "../util/validate.js";
import {
  createCommunity,
  deleteCommunity,
  getAllCommunities,
  getCommunityBy,
  updateCommunity,
} from "../functions/communityFunctions.js";
import type { Community } from "../types/CommunityType.js";
import { requireAdmin, requireAuth } from "../functions/authFunctions.js";

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
  const communities = await getAllCommunities();
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
    const community = await getCommunityBy("community_name", name);
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
 *     description: Create a community. Admins only. Responds with plain text.
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
 *       403:
 *         description: The user is not an admin.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
 *       500:
 *         description: Error creating community.
 */
CommunityRouter.post("/community/create", requireAuth, requireAdmin, async (req, res) => {
  const { community_id, community_name, community_desc, community_image_url } = req.body ?? {};
  if (!community_name || !validateCommunityName(community_name)) {
    res.status(400).send("Community name not provided or invalid.");
    return;
  }
  if (!community_desc) {
    res.status(400).send("Community description not provided.");
    return;
  }
  // The same checks as editing a community, so a community can't be created with something an edit would reject.
  const fields = validateCommunityChanges({ community_desc, community_image_url });
  if (typeof fields === "string") {
    res.status(400).send(fields);
    return;
  }
  // Only known fields are copied, so the request body can't set anything else.
  const newCommunity: Community = {
    community_id: community_id && validateUUID(community_id) ? community_id : crypto.randomUUID(),
    community_name: community_name,
    community_desc: fields.community_desc!,
    community_image_url: fields.community_image_url,
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
 *     description: Delete a community by ID. Its posts (and their comments) are deleted too. Admins only. Responds with plain text.
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
 *       403:
 *         description: The user is not an admin.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
 *       500:
 *         description: Error deleting community.
 */
CommunityRouter.delete("/community/:id", requireAuth, requireAdmin, async (req, res) => {
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

/**
 * @openapi
 * /community/{id}:
 *   patch:
 *     tags: [Community]
 *     description: Change a community's description, banner image URL or rules. Admins only. Fields left out stay as they are.
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               community_desc:
 *                 type: string
 *                 description: 1-255 characters after trimming.
 *               community_image_url:
 *                 type: string
 *                 nullable: true
 *                 description: An http(s) URL of at most 255 characters. Empty string or null removes the banner.
 *               community_rules:
 *                 type: array
 *                 maxItems: 20
 *                 description: Replaces all of the community's rules, in this order.
 *                 items:
 *                   $ref: '#/components/schemas/CommunityRule'
 *     responses:
 *       200:
 *         description: Community updated.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 community:
 *                   $ref: '#/components/schemas/Community'
 *       400:
 *         description: Invalid community ID or invalid fields.
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
 *         description: The user is not an admin.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
 *       404:
 *         description: Community not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
 *       500:
 *         description: Error updating community.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
 */
CommunityRouter.patch("/community/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = req.params.id;
  if (!validateUUID(id)) {
    res.status(400).send({ message: "Invalid community ID." });
    return;
  }
  const changes = validateCommunityChanges(req.body);
  if (typeof changes === "string") {
    res.status(400).send({ message: changes });
    return;
  }
  try {
    const community = await updateCommunity(id, changes);
    if (community === null) {
      res.status(404).send({ message: "Community not found." });
      return;
    }
    res.send({ message: "Community updated.", community });
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Error updating community." });
  }
});
