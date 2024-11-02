import express from "express";
import { generateJWT, verifyJWT, decodeJWT } from "../functions/authFunctions.js";
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

/**
 * @openapi
 * /auth/verify:
 *   get:
 *     tags: [Auth]
 *     description: Verify a JWT.
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         description: JWT to verify
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: JWT verified successfully.
 *       400:
 *         description: JWT verification failed.
 */
AuthRouter.get("/auth/verify", (req, res) => {
    const token = req.query.token as string;
    if (!token) {
        res.status(400).send("Missing required fields.");
    }
    else {
        verifyJWT(token).then((result) => {
            if (result) {
                res.status(200).send("JWT verified successfully.");
            }
            else {
                res.status(400).send("JWT verification failed.");
            }
        });
    }
});
