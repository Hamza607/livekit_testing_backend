"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const body_parser_1 = __importDefault(require("body-parser"));
const dotenv_1 = __importDefault(require("dotenv"));
const livekit_server_sdk_1 = require("livekit-server-sdk");
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(body_parser_1.default.json());
const LIVEKIT_URL = process.env.LIVEKIT_URL || "https://localhost:7880";
const API_KEY = process.env.LIVEKIT_API_KEY || "";
const API_SECRET = process.env.LIVEKIT_API_SECRET || "";
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
if (!API_KEY || !API_SECRET) {
    console.warn("LIVEKIT_API_KEY or LIVEKIT_API_SECRET not set. Token generation will fail until set.");
}
// Health check
app.get("/", (_req, res) => {
    res.json({ status: "ok", livekitUrl: LIVEKIT_URL });
});
// Generate token
app.post("/get-token", async (req, res) => {
    const { identity, roomName, ttlSeconds = 3600, metadata } = req.body;
    if (!identity)
        return res.status(400).json({ error: "identity is required" });
    const at = new livekit_server_sdk_1.AccessToken(API_KEY, API_SECRET, {
        identity,
        ttl: ttlSeconds,
        metadata,
    });
    at.addGrant({
        roomJoin: true,
        room: roomName,
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
        const client = new livekit_server_sdk_1.RoomServiceClient(LIVEKIT_URL, API_KEY, API_SECRET);
        const room = await client.createRoom({ name: roomName });
        return res.json({ room });
    }
    catch (err) {
        console.error(err);
        return res
            .status(500)
            .json({ error: err?.message || "create_room_failed" });
    }
});
// List rooms
app.get("/rooms", async (_req, res) => {
    try {
        const client = new livekit_server_sdk_1.RoomServiceClient(LIVEKIT_URL, API_KEY, API_SECRET);
        const rooms = await client.listRooms();
        return res.json({ rooms });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: err?.message || "list_rooms_failed" });
    }
});
// Start server
app.listen(PORT, () => {
    console.log(`LiveKit backend running on http://localhost:${PORT}`);
});
