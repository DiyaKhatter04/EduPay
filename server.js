// EduConnect Platform - Main Server File
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');
const mongoose = require('mongoose');
const expressLayouts = require('express-ejs-layouts');
require('dotenv').config();

// Import routes and middleware
const authRoutes = require('./routes/auth');
const studentRoutes = require('./routes/student'); // Ensure this points to the correct file
const donorRoutes = require('./routes/donor');
const adminRoutes = require('./routes/admin');
const errorHandler = require('./middleware/errorHandler');

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Database connection
const connectDB = require('./config/database');
connectDB();

// Middleware setup
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// EJS setup
app.use(expressLayouts);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('layout', 'layouts/main');

// Make Socket.io available to routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Home page route
app.get('/', (req, res) => {
  res.render('home', {
    title: 'EduConnect - Smart Micro-Scholarship Platform',
    user: null,
    success: null,
    error: null
  });
});

// Routes
app.use('/auth', authRoutes);
app.use('/student', studentRoutes);
app.use('/donor', donorRoutes);
app.use('/admin', adminRoutes);

// 404 handler (must be the LAST route in your stack)
app.use((req, res, next) => {
  const err = new Error('Page Not Found');
  err.status = 404;
  next(err);
});

// Error handling middleware
app.use(errorHandler);

// Socket.io real-time events
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', (role) => {
    socket.join(role);
    console.log(`User joined ${role} room`);
  });

  socket.on('student-request', (data) => {
    socket.to('admin').emit('new-student-request', data);
    socket.to('donor').emit('new-student-request', data);
  });

  socket.on('donor-offering', (data) => {
    socket.to('student').emit('new-donor-offering', data);
    socket.to('admin').emit('new-donor-offering', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Auto-run seeder on first start (development only)
if (process.env.NODE_ENV === 'development' && process.env.SEED_ON_START === 'true') {
  setTimeout(() => {
    const seedData = require('./scripts/seed');
    // seedData(); // uncomment on first run
  }, 2000);
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 EduConnect server running on http://localhost:${PORT}`);
  console.log(`📊 MongoDB: ${process.env.MONGO_URI}`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV}`);
});

module.exports = { app, io };