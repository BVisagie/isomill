import { serve } from "@hono/node-server";
import { app } from "./app.js";
import { migrate } from "./db.js";

const port = Number(process.env.PORT ?? 3001);

await migrate();

serve({ fetch: app.fetch, port }, () => {
  console.log(`isomill api listening on ${port}`);
});
