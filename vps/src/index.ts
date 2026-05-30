import "dotenv/config";
import cors from "cors";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { authMiddleware } from "./middleware/auth.js";
import { sessionRouter } from "./routes/sessions.js";
import { messageRouter } from "./routes/messages.js";
import { healthRouter } from "./routes/health.js";
import { setupSocketHandlers } from "./socket/handlers.js";
import { startTakeoverTimeoutJob } from "./jobs/takeover-timeout.js";
import { startReminderJob } from "./jobs/reminders.js";

const PORT = Number(process.env.PORT) || 3001;
const DASHBOARD_URL = process.env.DASHBOARD_URL || "http://localhost:3000";

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: [DASHBOARD_URL, "http://localhost:3000"],
    methods: ["GET", "POST"],
  },
});

app.use(cors({ origin: [DASHBOARD_URL, "http://localhost:3000"] }));
app.use(express.json());

app.use("/health", healthRouter);
app.use("/api/sessions", authMiddleware, sessionRouter(io));
app.use("/api/messages", authMiddleware, messageRouter);

setupSocketHandlers(io);

startTakeoverTimeoutJob();
startReminderJob();

httpServer.listen(PORT, () => {
  console.log(`[Apuntado VPS] Servidor corriendo en puerto ${PORT}`);
});

export { io };
