import express from "express";
import { validateUUID } from "../util/validate";
import { getAll, getOne, insertOne } from "../db/database";
import type { OmittedUser, User } from "../types/UserType";
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
 */
UserRouter.get("/users", async (req, res) => {
    //TODO: move this a separate function.
    const users: User[] = await getAll("Users") as User[];
    const omittedUsers: OmittedUser[] = users.map(({ email, password, created_at, modified_at, ...user }) => user);
    res.send(omittedUsers);
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
 */
UserRouter.get("/users/:id", async (req, res) => {
    if (!validateUUID(req.params.id)) {
      res.status(400).send("Invalid UUID.");
      return;
    }
    else {
      const id = req.params.id;
      const user: User = await getOne("Users", "user_id", id) as User;
      if(user === null) {
        res.status(404).send("User not found.");
        return;
      }
      else {
        //TODO: move this a separate function.
        const omittedUser: OmittedUser = {
          username: user.username,
          user_id: user.user_id
        }
        res.send(omittedUser);
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