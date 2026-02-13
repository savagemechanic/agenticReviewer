import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import { discover } from "./routes/discover.js";
import { process as processRoute } from "./routes/process.js";
import { summarize } from "./routes/summarize.js";
import { score } from "./routes/score.js";
import { videoRender } from "./routes/video.js";
import { distribute } from "./routes/distribute.js";
import { products } from "./routes/products.js";

const app = new Hono();

app.use("*", logger());
app.use("*", cors());

app.get("/health", (c) => c.json({ status: "ok" }));

app.route("/discover", discover);
app.route("/process", processRoute);
app.route("/summarize", summarize);
app.route("/score", score);
app.route("/video", videoRender);
app.route("/distribute", distribute);
app.route("/products", products);

export { app };
