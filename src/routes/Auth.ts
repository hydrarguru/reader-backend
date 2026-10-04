import express from "express";
import { generateJWT, verifyJWT, decodeJWT } from "../functions/authFunctions.js";
import { authenticateUser } from "../functions/userFunctions.js";
export const AuthRouter = express.Router();
/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     description: Log in with username and password. Returns a JWT (valid for 7 days) to send in the Authorization header as "Bearer <token>".
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Logged in.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       400:
 *         description: Missing required fields.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
 *       401:
 *         description: Invalid username or password.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
 *       500:
 *         description: Error logging in.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
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
 *     description: Verify a JWT. Responds with plain text.
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         description: JWT to verify
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: JWT is valid.
 *       400:
 *         description: Token missing, invalid or expired.
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
 *     description: Verify a JWT and return its payload.
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         description: JWT to decode
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: The token's payload.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TokenPayload'
 *       400:
 *         description: Token missing, invalid or expired (plain text).
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