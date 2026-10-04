import express from "express";
import { getAll, getOne } from "../db/database.js";
import { validateCommunityName, validateUUID } from "../util/validate.js";
import {
  createCommunity,
  deleteCommunity,
} from "../functions/communityFunctions.js";
import type { Community } from "../types/CommunityType.js";

export const CommunityRouter = express.Router();

/**
 * @openapi
 * /community/all:
 *   get:
 *     tags: [Community]
 *     description: Get all communities
 *     responses:
 *       200:
 *         description: Returns all communities
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
 *     description: Get a information about a community by name
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         description: Name of the community
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Returns the community
 *       400:
 *         description: Invalid community name
 *       404:
 *         description: Community not found
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
 *     description: Create a community
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               community_name:
 *                 type: string
 *               community_desc:
 *                 type: string
 *     responses:
 *       201:
 *         description: Community created
 *       400:
 *         description: Community name not provided
 */
CommunityRouter.post("/community/create", async (req, res) => {
  const request = req.body as Community;
  if (request.community_name === undefined || request.community_name === "") {
    res.status(400).send("Community name not provided.");
    return;
  }
  // Only known fields are copied: insertOne uses the object's keys as column names.
  const newCommunity: Community = {
    community_id: request.community_id || crypto.randomUUID(),
    community_name: request.community_name,
    community_desc: request.community_desc,
    community_image_url: request.community_image_url,
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
 *     description: Delete a community by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the community
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Community deleted
 *       400:
 *         description: Invalid community ID
 */
CommunityRouter.delete("/community/:id", async (req, res) => {
  const id = req.params.id;
  if (!validateUUID(id)) {
    res.status(400).send("Invalid community ID.");
    return;
  } else {
    await deleteCommunity(id);
    res.send("Community deleted.");
  }
});
