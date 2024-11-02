import express from "express";
import { validateUUID } from "../util/validate.js";
import { insertOne } from "../db/database.js";
import type { User } from "../types/UserType.js";
import { getAllUsers, getUser } from "../functions/userFunctions.js";
export const UserRouter = express.Router();

/**
 * @openapi
 * /users:
 *   get:
 *     tags: [User]
 *     description: returns all users.
 *     responses:
 *       200:
 *         description: Returns all users.
 *       404:
 *         description: Error fetching users.
 */
UserRouter.get("/users", async (req, res) => {
    const users = await getAllUsers();
    if(users === null) {
      res.status(404).send("Error fetching users.");
    }
    else {
      res.send(users);
    }
});


/**
 * @openapi
 * /users/{id}:
 *   get:
 *     tags: [User]
 *     description: returns a user by id.
 *     responses:
 *       200:
 *         description: Returns a user.
 *       404:
 *         description: User not found.
 */
UserRouter.get("/users/:id", async (req, res) => {
    if (!validateUUID(req.params.id)) {
      res.status(400).send("Invalid UUID.");
      return;
    }
    else {
      const id = req.params.id;
      const user = await getUser(id);
      if(user === null) {
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
 * /users/create:
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
 *       500:
 *         description: Error creating user.
 */
UserRouter.post('/users/create', async (req, res) => {
    const newUser: User = {
        user_id: crypto.randomUUID(),
        username: req.body.username,
        password: req.body.password,
        email: req.body.email
    };
    await insertOne('Users', newUser).catch((err) => {
        console.error(err);
        res.status(500).send({
          message: 'Error creating user.',
          error: err
        });
    }).finally(() => {
        res.status(201).send('User created.');
    });
});