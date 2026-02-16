require('dotenv').config();


const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// Middleware
// Middleware
app.use(cors());

// Security Headers
const helmet = require('helmet');
app.use(helmet());

// Rate Limiting
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: "Too many requests from this IP, please try again later."
});
app.use(limiter);

// Data Sanitization
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');

app.use(mongoSanitize()); // Prevent NoSQL Injection
app.use(xss()); // Prevent XSS

app.use(express.json({ limit: '10kb' })); // Body limit
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Serve images

// Database Connection
const connectDB = require('./config/db');
connectDB();

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/resources', require('./routes/resourceRoutes'));
app.use('/api/complaints', require('./routes/complaintRoutes'));
app.use('/api/library', require('./routes/libraryRoutes'));
app.use('/api/environment', require('./routes/environmentalRoutes')); // NEW AI Observer Routes
app.use('/api/messages', require('./routes/messageRoutes'));
app.use('/api/alerts', require('./routes/alertRoutes'));
app.use('/api/insights', require('./routes/insightRoutes'));
app.use('/api/events', require('./routes/eventRoutes')); // Register Event Routes
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/food', require('./routes/foodRoutes'));

// Socket.io for Real-time updates (Library/Alerts)
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
});
app.set('socketio', io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Background Jobs
const libraryController = require('./controllers/libraryController');
setInterval(() => {
  libraryController.checkExpiredBookings();
}, 60 * 1000); // Check every minute
