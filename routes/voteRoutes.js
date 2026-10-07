const express = require("express");
const User = require("../models/user");
const Candidate = require("../models/candidates");
const { jwtAuthenticate } = require("../middleware/authMiddleware");

const router = express.Router();


// ==========================================
// CAST VOTE
// POST /api/vote/:candidateId
// Protected: Only verified 'voter' can vote once
// ==========================================
router.post("/:candidateId", jwtAuthenticate, async (req, res) => {

    try {

        // 1. Find logged-in user
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        // 2. Enforce role-based voting restrictions
        if (user.role === "candidate") {
            return res.status(403).json({
                message: "Candidates are not allowed to vote"
            });
        }

        if (user.role === "admin") {
            return res.status(403).json({
                message: "Admins are not allowed to vote"
            });
        }

        if (user.role !== "voter") {
            return res.status(403).json({
                message: "Only registered voters can cast a vote"
            });
        }

        // 3. Check if voter has already voted
        if (user.isVoted) {
            return res.status(400).json({
                message: "You have already voted"
            });
        }

        // 4. Find candidate by ID
        const candidate = await Candidate.findById(req.params.candidateId);

        if (!candidate) {
            return res.status(404).json({
                message: "Candidate not found"
            });
        }

        // 5. Record the vote and increment count securely
        candidate.votes.push({
            user: user._id,
            votedAt: new Date()
        });
        candidate.voteCount += 1;

        // 6. Mark user as voted
        user.isVoted = true;

        // 7. Save both records
        await candidate.save();
        await user.save();

        res.status(200).json({
            message: "Vote recorded successfully",
            candidate: candidate.name,
            party: candidate.party
        });

    } catch (error) {

        console.error("Voting error:", error);

        res.status(500).json({
            message: "Error recording vote",
            error: error.message
        });

    }

});


// ==========================================
// GET ELECTION RESULTS / VOTE COUNTS
// GET /api/vote/counts
// Public: View candidates and their vote counts sorted highest to lowest
// ==========================================
router.get("/counts", async (req, res) => {

    try {

        // Sort candidates by voteCount descending (highest votes first)
        const results = await Candidate.find()
            .select("name party voteCount")
            .sort({ voteCount: -1 });

        res.status(200).json({
            results: results
        });

    } catch (error) {

        console.error("Fetch vote counts error:", error);

        res.status(500).json({
            message: "Error fetching election results",
            error: error.message
        });

    }

});


module.exports = router;