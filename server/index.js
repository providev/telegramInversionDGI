import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import telegramService from "./services/TelegramService.js";
import path from "path";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*", // Allow all for dev
    methods: ["GET", "POST"]
  }
});

const PORT = 3000;

app.use(cors());
app.use(express.json());

// Middleware to log requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Socket.IO connection
io.on("connection", (socket) => {
  console.log("Client connected to socket");
  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

// Inject io into service
telegramService.setSocket(io);

// Status endpoint
app.get("/api/status", async (req, res) => {
  try {
    const status = await telegramService.getStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Auth endpoints
app.post("/api/auth/phone", async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    await telegramService.sendCode(phoneNumber);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/auth/code", async (req, res) => {
  try {
    const { code } = req.body;
    const result = await telegramService.signIn(code);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/auth/password", async (req, res) => {
  try {
    const { password } = req.body;
    await telegramService.checkPassword(password);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Extraction endpoint
app.post("/api/extract", async (req, res) => {
  try {
    const { subchannel, startDate, endDate } = req.body;
    // We don't await the extraction here to avoid timeout,
    // but the user wants to see logs, so we can just trigger it.
    // However, the original code awaited it. Let's await it but rely on socket for progress.
    const result = await telegramService.extract(subchannel, startDate, endDate);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Files endpoints
app.get("/api/files", (req, res) => {
  try {
    const files = telegramService.getFiles();
    res.json(files);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/files/:filename", (req, res) => {
  const { filename } = req.params;
  const filePath = telegramService.getFilePath(filename);

  // Basic security check (though getFilePath should handle it, double check here if needed or just trust service)
  // The service returns a path in FILES_REPO. We can verify existence.
  // Actually, res.download handles existence check usually, but good to be safe.

  res.download(filePath, (err) => {
      if (err) {
          if (!res.headersSent) {
              res.status(404).send("File not found");
          }
      }
  });
});

app.delete("/api/files/:filename", (req, res) => {
  try {
    const { filename } = req.params;
    const success = telegramService.deleteFile(filename);
    if (success) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "File not found" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
