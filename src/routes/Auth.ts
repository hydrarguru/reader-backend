import express from "express";
import { generateJWT } from "../functions/authFunctions.js";
export const AuthRouter = express.Router();
/**
 * @openapi
 * /auth:
 *   post:
 *     tags: [Auth]
 *     description: Generate a JWT for a user.
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         description: UUID of the user
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: JWT generated successfully.
 *       400:
 *         description: Missing required fields.
 */

AuthRouter.post("/auth", (req, res) => {
    const id = req.query.userId as string;
    if (!id) {
        res.status(400).send("Missing required fields.");
    }
    else {
        generateJWT(id).then((jwt) => {
            res.status(200).send(jwt);
        });
    }
});