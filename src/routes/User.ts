import express from "express";
import { validateUUID } from "../util/validate.js";
import type { User } from "../types/UserType.js";
import { createUser, getAllUsers, getUser } from "../functions/userFunctions.js";
export const UserRouter = express.Router();

/**
 * @openapi
 * /user/all:
 *   get:
 *     tags: [User]
 *     description: returns all users.
 *     responses:
 *       200:
 *         description: Returns all users.
 *       404:
 *         description: Error fetching users.
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
 *     description: returns a user by id.
 *     responses:
 *       200:
 *         description: Returns a user.
 *       404:
 *         description: User not found.
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
 *     description: creates a user.
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
 *               email:
 *                 type: string
 *     responses:
 *       201:
 *         description: User created.
 *       400:
 *         description: Missing required fields.
 *       409:
 *         description: Username or email already in use.
 *       500:
 *         description: Error creating user.
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
