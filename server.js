const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const candidateRoutes = require("./routes/candidateRoutes");
const voteRoutes = require("./routes/voteRoutes");
const userRoutes = require("./routes/userRoutes");
const resultRoutes = require("./routes/resultRoutes");

dotenv.config();

const app = express();

// Middleware to parse JSON request bodies
app.use(express.json());

// Connect to MongoDB
connectDB();

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/candidates", candidateRoutes);
app.use("/api/vote", voteRoutes);
app.use("/api/profile", userRoutes);
app.use("/api/results", resultRoutes);

// Health check / welcome route
app.get("/", (req, res) => {
    res.json({
        message: "Voting Management Backend API is running successfully"
    });
});

// Start server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});