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
app.set('trust proxy', 1);
const server = http.createServer(app);

// Socket.io
const io = new Server(server, {
  cors: {
    origin: "*",
  }
});

// ===== Middleware =====
app.use(cors());
app.use(helmet());

// Rate limit
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: "Too many requests, please try again later."
});
app.use(limiter);

// Security sanitization
app.use(mongoSanitize());
app.use(xss());

// Body parser
app.use(express.json({ limit: '10kb' }));

// Static folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ===== Health Route (Railway network check) =====
app.get("/", (req, res) => {
  res.send("Smart Campus API is running 🚀");
});

// ===== Database =====
const connectDB = require('./config/db');
connectDB();

// ===== Routes =====
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

// ===== Socket connection =====
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
});

app.set('socketio', io);

// ===== Start Server (Railway compatible) =====
const PORT = process.env.PORT || 5000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});

// ===== Background Job =====
const libraryController = require('./controllers/libraryController');

setInterval(() => {
  libraryController.checkExpiredBookings();
}, 60 * 1000);
