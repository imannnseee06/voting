const express = require("express");
const User = require("../models/user");
const Candidate = require("../models/candidates");
const { generateToken } = require("../middleware/authMiddleware");

const router = express.Router();


// ==========================================
// SIGNUP
// POST /api/auth/signup
// Allows registration as 'voter' or 'candidate'
// NEVER allows public registration as 'admin'
// ==========================================
router.post("/signup", async (req, res) => {

    try {

        const {
            name,
            age,
            mobile,
            email,
            address,
            aadharCardNumber,
            password,
            role,
            party
        } = req.body;

        // Security check: Never trust admin role from client
        if (role === "admin") {
            return res.status(403).json({
                message: "Admin registration is not allowed through signup"
            });
        }

        // Validate role: only 'voter' or 'candidate'
        const userRole = role === "candidate" ? "candidate" : "voter";

        // If registering as candidate, party is required
        if (userRole === "candidate") {

            if (!party || party.trim() === "") {
                return res.status(400).json({
                    message: "Party name is required for candidate registration"
                });
            }

            // Check if party name is already taken (One candidate = One party)
            const existingParty = await Candidate.findOne({ party: party.trim() });
            if (existingParty) {
                return res.status(400).json({
                    message: "A candidate for this party is already registered"
                });
            }
        }

        // Check if Aadhaar or Email already exists
        const existingUser = await User.findOne({
            $or: [
                { aadharCardNumber },
                { email }
            ]
        });

        if (existingUser) {
            return res.status(400).json({
                message: "User with this Aadhaar card number or email already exists"
            });
        }

        // Create new User
        const newUser = new User({
            name,
            age,
            mobile,
            email,
            address,
            aadharCardNumber,
            password,
            role: userRole
        });

        const savedUser = await newUser.save();

        // If candidate, create the linked Candidate profile
        let candidateProfile = null;
        if (userRole === "candidate") {
            const newCandidate = new Candidate({
                userId: savedUser._id,
                name: savedUser.name,
                age: savedUser.age,
                party: party.trim()
            });

            candidateProfile = await newCandidate.save();
        }

        // Generate JWT token
        const token = generateToken(savedUser);

        res.status(201).json({
            message: "User registered successfully",
            token: token,
            user: {
                id: savedUser._id,
                name: savedUser.name,
                role: savedUser.role,
                aadharCardNumber: savedUser.aadharCardNumber
            },
            candidate: candidateProfile ? {
                id: candidateProfile._id,
                party: candidateProfile.party
            } : null
        });

    } catch (error) {

        console.error("Signup error:", error);

        res.status(500).json({
            message: "Error creating user",
            error: error.message
        });

    }

});


// ==========================================
// LOGIN
// POST /api/auth/login
// Authenticates using Aadhaar Card Number & Password
// ==========================================
router.post("/login", async (req, res) => {

    try {

        const { aadharCardNumber, password } = req.body;

        // Check required fields
        if (!aadharCardNumber || !password) {
            return res.status(400).json({
                message: "Aadhaar card number and password are required"
            });
        }

        // Find user by Aadhaar Card Number
        const user = await User.findOne({ aadharCardNumber });

        if (!user) {
            return res.status(401).json({
                message: "Invalid Aadhaar card number or password"
            });
        }

        // Compare hashed password
        const isMatch = await user.comparePassword(password);

        if (!isMatch) {
            return res.status(401).json({
                message: "Invalid Aadhaar card number or password"
            });
        }

        // Generate JWT token
        const token = generateToken(user);

        res.status(200).json({
            message: "Login successful",
            token: token,
            user: {
                id: user._id,
                name: user.name,
                role: user.role,
                isVoted: user.isVoted
            }
        });

    } catch (error) {

        console.error("Login error:", error);

        res.status(500).json({
            message: "Error during login",
            error: error.message
        });

    }

});


module.exports = router;