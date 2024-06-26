import express from "express";
import { validateUUID } from "../util/validate";
import { getAll, getOne, insertOne } from "../db";
import type { User } from "../types/UserType";
export const UserRouter = express.Router();

UserRouter.get("/users", async (req, res) => {
    const users = await getAll("Users");
    res.send(users);
});

UserRouter.get("/users/:id", async (req, res) => {
    if (!validateUUID(req.params.id)) {
      res.status(400).send("Invalid UUID.");
      return;
    }
    else {
      const id = req.params.id;
      const user = await getOne("Users", "user_id", id);
      if(user === null) {
        res.status(404).send("User not found.");
        return;
      }
      else {
        res.send(user);
      }
    }
});

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