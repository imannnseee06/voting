const express = require("express");
const User = require("../models/user");
const { jwtAuthenticate } = require("../middleware/authMiddleware");

const router = express.Router();


// ==========================================
// GET USER PROFILE
// GET /api/profile
// Protected: Any authenticated user
// ==========================================
router.get("/", jwtAuthenticate, async (req, res) => {

    try {

        // Find user by ID from JWT token, exclude password
        const user = await User.findById(req.user.id).select("-password");

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        res.status(200).json({
            user: user
        });

    } catch (error) {

        console.error("Profile fetch error:", error);

        res.status(500).json({
            message: "Error fetching profile",
            error: error.message
        });

    }

});


// ==========================================
// CHANGE PASSWORD
// PUT /api/profile/password
// Protected: Logged-in user changing their own password
// ==========================================
router.put("/password", jwtAuthenticate, async (req, res) => {

    try {

        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                message: "Current password and new password are required"
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                message: "New password must be at least 6 characters long"
            });
        }

        // Find user including password field for verification
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        // Verify current password
        const isMatch = await user.comparePassword(currentPassword);

        if (!isMatch) {
            return res.status(401).json({
                message: "Incorrect current password"
            });
        }

        // Set new password (pre-save hook will hash it)
        user.password = newPassword;

        await user.save();

        res.status(200).json({
            message: "Password updated successfully"
        });

    } catch (error) {

        console.error("Change password error:", error);

        res.status(500).json({
            message: "Error updating password",
            error: error.message
        });

    }

});


module.exports = router;
