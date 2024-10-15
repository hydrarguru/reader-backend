import express from "express";
export const BaseRouter = express.Router();

/**
 * @openapi
 * /health:
 *   get:
 *     tags: [Misc]
 *     description: Check if the API is running.
 *     responses:
 *       200:
 *         description: API is running.
 */
BaseRouter.get("/health", (req, res) => {
    res.status(200).send("API is running.");
});

BaseRouter.get("/", (req, res) => {
    const request = req;
    console.log (request);
    res.redirect("/api-docs");
});