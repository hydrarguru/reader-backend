import express from "express";
import { generateJWT, verifyJWT, decodeJWT } from "../functions/authFunctions.js";
import { authenticateUser } from "../functions/userFunctions.js";
export const AuthRouter = express.Router();
/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     description: Log in with username and password. Returns a JWT (valid for 7 days) to send as "Authorization Bearer <token>".
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Logged in, returns the token and user id.
 *       400:
 *         description: Missing required fields.
 *       401:
 *         description: Invalid username or password.
 */
AuthRouter.post("/auth/login", async (req, res) => {
    const { username, password } = req.body ?? {};
    if (typeof username !== "string" || typeof password !== "string" || !username || !password) {
        res.status(400).send({ message: "Missing required fields." });
        return;
    }
    try {
        const userId = await authenticateUser(username, password);
        if (userId === null) {
            res.status(401).send({ message: "Invalid username or password." });
            return;
        }
        res.status(200).send({ token: await generateJWT(userId), user_id: userId });
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Error logging in." });
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

/**
 * @openapi
 * /auth/decode:
 *   get:
 *     tags: [Auth]
 *     description: Decode a JWT.
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         description: JWT to decode
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: JWT decoded successfully.
 *       400:
 *         description: JWT decoding failed.
 */
AuthRouter.get("/auth/decode", (req, res) => {
    const token = req.query.token as string;
    if (!token) {
        res.status(400).send("Missing required fields.");
    }
    else {
        decodeJWT(token).then((result) => {
            if (result) {
                res.status(200).send(result);
            }
            else {
                res.status(400).send("JWT decoding failed.");
            }
        });
    }
});