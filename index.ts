import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import { AccessToken, RoomServiceClient } from "livekit-server-sdk";

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const LIVEKIT_URL = process.env.LIVEKIT_URL || "https://localhost:7880";
const API_KEY = process.env.LIVEKIT_API_KEY || "";
const API_SECRET = process.env.LIVEKIT_API_SECRET || "";
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

if (!API_KEY || !API_SECRET) {
  console.warn(
    "LIVEKIT_API_KEY or LIVEKIT_API_SECRET not set. Token generation will fail until set."
  );
}

// Health check
app.get("/", (_req, res) => {
  res.json({ status: "ok", livekitUrl: LIVEKIT_URL });
});

// Generate token
app.post("/get-token", async (req, res) => {
  const { identity, roomName, ttlSeconds = 3600, metadata } = req.body;
  if (!identity) return res.status(400).json({ error: "identity is required" });

  const at = new AccessToken(API_KEY, API_SECRET, {
    identity,
    ttl: ttlSeconds,
    metadata,
  });

  at.addGrant({
    roomJoin: true,
    room:roomName,
    canPublish: true, // <-- MUST be true to send video
    canSubscribe: true,
  });

  const token = await at.toJwt();
  res.json({ token });
});
// Create room
app.post("/create-room", async (req, res) => {
  try {
    const { roomName } = req.body;
    if (!roomName)
      return res.status(400).json({ error: "roomName is required" });

    const client = new RoomServiceClient(LIVEKIT_URL, API_KEY, API_SECRET);
    const room = await client.createRoom({ name: roomName });
    return res.json({ room });
  } catch (err: any) {
    console.error(err);
    return res
      .status(500)
      .json({ error: err?.message || "create_room_failed" });
  }
});

// List rooms
app.get("/rooms", async (_req, res) => {
  try {
    const client = new RoomServiceClient(LIVEKIT_URL, API_KEY, API_SECRET);
    const rooms = await client.listRooms();
    return res.json({ rooms });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err?.message || "list_rooms_failed" });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`LiveKit backend running on http://localhost:${PORT}`);
});
