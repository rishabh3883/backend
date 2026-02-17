require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');

const app = express();
const server = http.createServer(app);

/* ================== TRUST PROXY (IMPORTANT FOR RAILWAY) ================== */
app.set('trust proxy', 1);

/* ================== SOCKET.IO ================== */
const io = new Server(server, {
  cors: {
    origin: [
      "https://your-frontend.vercel.app",
      "http://localhost:5173"
    ],
    methods: ["GET", "POST"],
    credentials: true
  }
});

/* ================== SECURITY + MIDDLEWARE ================== */
app.use(cors({
  origin: [
    "https://your-frontend.vercel.app",
    "http://localhost:5173"
  ],
  credentials: true
}));

app.use(helmet());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many requests, please try again later."
});
app.use(limiter);

app.use(mongoSanitize());
app.use(xss());
app.use(express.json({ limit: '10kb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

/* ================== HEALTH CHECK ================== */
app.get("/", (req, res) => {
  res.status(200).send("Smart Campus API is running 🚀");
});

/* ================== DATABASE ================== */
const connectDB = require('./config/db');
connectDB();

/* ================== ROUTES ================== */
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/resources', require('./routes/resourceRoutes'));
app.use('/api/complaints', require('./routes/complaintRoutes'));
app.use('/api/library', require('./routes/libraryRoutes'));
app.use('/api/environment', require('./routes/environmentalRoutes'));
app.use('/api/messages', require('./routes/messageRoutes'));
app.use('/api/alerts', require('./routes/alertRoutes'));
app.use('/api/insights', require('./routes/insightRoutes'));
app.use('/api/events', require('./routes/eventRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/food', require('./routes/foodRoutes'));

/* ================== SOCKET EVENTS ================== */
io.on('connection', (socket) => {
  console.log('New Client connected:', socket.id);

  socket.on('join-room', (role) => {
    if (role) {
      socket.join(role);
      console.log(`Socket ${socket.id} joined room: ${role}`);
    }
  });

  socket.on('test-trigger-alarm', (data) => {
    console.log("ALARM TRIGGERED:", data);
    io.emit('emergency-alert', data);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

app.set('socketio', io);

/* ================== SERVER START ================== */
const PORT = process.env.PORT || 5000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});

/* ================== BACKGROUND JOB ================== */
const libraryController = require('./controllers/libraryController');

setInterval(() => {
  libraryController.checkExpiredBookings();
}, 60 * 1000);
