import express from "express";
import { getAll, getOne } from "../db";
import { validateCommunityName } from "../util/validate";
import type { Community } from "../types/CommunityType";
import { createCommunity } from "../functions/communityFunctions";

export const CommunityRouter = express.Router();

CommunityRouter.get("/community", async (req, res) => {
    const communities = await getAll("Communities");
    res.send(communities);
});
  
CommunityRouter.get("/community/:name", async (req, res) => {
    const name = req.params.name;
    if (!validateCommunityName(name)) {
        res.status(400).send("Invalid community name.");
        return;
    }
    else {
        const community = await getOne("Communities", "community_name", name);
        if(community === null) {
            res.status(404).send("Community not found.");
            return;
        }
        else {
            res.send({community: community})
        }
    }
});

CommunityRouter.post("/community/create", async (req, res) => {
    const request = req.body as Community;
    if (request.community_name === undefined || request.community_name === "") {
        res.status(400).send("Community name not provided.");
        return;
    }
    if (request.community_id === undefined || request.community_id === "") {
        console.warn('Community ID not provided, generating one.');
        const newCommunity: Community = {
            community_id: crypto.randomUUID(),
            community_name: request.community_name,
            community_desc: request.community_desc,
        };
        if (await createCommunity(newCommunity)) {
            res.status(201).send('Community created: ' + JSON.stringify(newCommunity));
        }
        else {
            res.status(400).send('Community name already exists.');
        }
    }
    else {
        if (await createCommunity(request)) {
            res.status(201).send('Community created: ' + JSON.stringify(request));
        }
        else {
            res.status(400).send('Community name already exists.');
        }
    }
});