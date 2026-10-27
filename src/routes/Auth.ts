import express from "express";
import { generateJWT, isAdmin, rateLimit } from "../functions/authFunctions.js";
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
AuthRouter.post("/auth/login", rateLimit, async (req, res) => {
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
        res.status(200).send({ token: await generateJWT(userId), user_id: userId, is_admin: await isAdmin(userId) });
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Error logging in." });
    }
});
