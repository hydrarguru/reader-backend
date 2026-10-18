import express from "express";
import { validateUserChanges, validateUUID } from "../util/validate.js";
import type { User } from "../types/UserType.js";
import { createUser, deleteUser, getAllUsers, getUser, updateUser, verifyUserPassword } from "../functions/userFunctions.js";
import { isAdmin, requireAuth } from "../functions/authFunctions.js";
export const UserRouter = express.Router();

/**
 * @openapi
 * /user/all:
 *   get:
 *     tags: [User]
 *     description: Get all users (at most 100), without emails or passwords.
 *     responses:
 *       200:
 *         description: List of users.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/PublicUser'
 *       404:
 *         description: Error fetching users (plain text).
 */
UserRouter.get("/user/all", async (req, res) => {
  const users = await getAllUsers();
  if (users === null) {
    res.status(404).send("Error fetching users.");
  }
  else {
    res.send(users);
  }
});


/**
 * @openapi
 * /user/{id}:
 *   get:
 *     tags: [User]
 *     description: Get a user by ID, without email or password.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: UUID of the user
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: The user.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PublicUser'
 *       400:
 *         description: Invalid UUID (plain text).
 *       404:
 *         description: User not found (plain text).
 */
UserRouter.get("/user/:id", async (req, res) => {
  if (!validateUUID(req.params.id)) {
    res.status(400).send("Invalid UUID.");
    return;
  }
  else {
    const id = req.params.id;
    const user = await getUser(id);
    if (user === null) {
      res.status(404).send("User not found.");
      return;
    }
    else {
      res.send(user);
    }
  }
});



/**
 * @openapi
 * /user/create:
 *   post:
 *     tags: [User]
 *     description: Create a user (sign up). Log in afterwards with /auth/login.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password, email]
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *               email:
 *                 type: string
 *     responses:
 *       201:
 *         description: User created.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/PublicUser'
 *       400:
 *         description: Missing required fields.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
 *       409:
 *         description: Username or email already in use.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
 *       500:
 *         description: Error creating user.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
 */
UserRouter.post('/user/create', async (req, res) => {
  const { username, password, email } = req.body ?? {};
  if ([username, password, email].some((field) => typeof field !== 'string' || field === '')) {
    res.status(400).send({ message: 'username, password and email are required.' });
    return;
  }
  const newUser: User = {
    user_id: crypto.randomUUID(),
    username: username,
    password: password,
    email: email
  };
  try {
    const result = await createUser(newUser);
    if (!result.ok) {
      res.status(409).send({ message: result.reason });
      return;
    }
    res.status(201).send({ message: 'User created.', user: result.user });
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: 'Error creating user.' });
  }
});


/**
 * @openapi
 * /user/{id}:
 *   patch:
 *     tags: [User]
 *     description: >
 *       Change your own username, email or password. Fields left out stay as they are.
 *       Changing the password needs current_password. A new username also shows on your existing posts and comments,
 *       and your token keeps working.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: UUID of the user (must be the logged-in user)
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
 *               username:
 *                 type: string
 *                 description: 1-50 characters without spaces. Trimmed.
 *               email:
 *                 type: string
 *                 description: At most 255 characters. Trimmed.
 *               password:
 *                 type: string
 *               current_password:
 *                 type: string
 *                 description: Required when changing password.
 *     responses:
 *       200:
 *         description: User updated.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/PublicUser'
 *       400:
 *         description: Invalid UUID, invalid fields, or nothing to change.
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
 *         description: Not your account, or current_password is wrong.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
 *       404:
 *         description: User not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
 *       409:
 *         description: Username or email already in use.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
 *       500:
 *         description: Error updating user.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
 */
UserRouter.patch("/user/:id", requireAuth, async (req, res) => {
  const id = req.params.id;
  if (!validateUUID(id)) {
    res.status(400).send({ message: "Invalid UUID." });
    return;
  }
  if (id !== res.locals.userId) {
    res.status(403).send({ message: "You can only edit your own account." });
    return;
  }
  const changes = validateUserChanges(req.body);
  if (typeof changes === "string") {
    res.status(400).send({ message: changes });
    return;
  }
  try {
    if (changes.password !== undefined && !(await verifyUserPassword(id, req.body.current_password))) {
      res.status(403).send({ message: "Current password is incorrect." });
      return;
    }
    const result = await updateUser(id, changes);
    if (!result.ok) {
      res.status(result.status).send({ message: result.reason });
      return;
    }
    res.send({ message: "User updated.", user: result.user });
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Error updating user." });
  }
});

/**
 * @openapi
 * /user/{id}:
 *   delete:
 *     tags: [User]
 *     description: >
 *       Delete a user along with their posts and comments. Users can delete their own account; admins can delete anyone's.
 *       The user's votes are removed from the scores of the posts that remain.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: UUID of the user
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: User deleted.
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
 *         description: Not your account and you aren't an admin.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
 *       404:
 *         description: User not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
 *       500:
 *         description: Error deleting user.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
 */
UserRouter.delete("/user/:id", requireAuth, async (req, res) => {
  const id = req.params.id;
  if (!validateUUID(id)) {
    res.status(400).send({ message: "Invalid UUID." });
    return;
  }
  try {
    if (id !== res.locals.userId && !(await isAdmin(res.locals.userId))) {
      res.status(403).send({ message: "You can only delete your own account." });
      return;
    }
    if (!(await deleteUser(id))) {
      res.status(404).send({ message: "User not found." });
      return;
    }
    res.send({ message: "User deleted." });
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Error deleting user." });
  }
});
