const express = require("express");
const Candidate = require("../models/candidates");
const User = require("../models/user");
const { jwtAuthenticate, adminOnly } = require("../middleware/authMiddleware");

const router = express.Router();


// ==========================================
// GET ALL CANDIDATES
// GET /api/candidates
// Public: Anyone can view the list of candidates
// ==========================================
router.get("/", async (req, res) => {

    try {

        // Return candidate list without exposing private voter IDs
        const candidates = await Candidate.find().select("-votes");

        res.status(200).json({
            candidates: candidates
        });

    } catch (error) {

        console.error("Fetch candidates error:", error);

        res.status(500).json({
            message: "Error fetching candidates",
            error: error.message
        });

    }

});


// ==========================================
// GET ONE CANDIDATE
// GET /api/candidates/:id
// Public: Anyone can view candidate details
// ==========================================
router.get("/:id", async (req, res) => {

    try {

        const candidate = await Candidate.findById(req.params.id).select("-votes");

        if (!candidate) {
            return res.status(404).json({
                message: "Candidate not found"
            });
        }

        res.status(200).json({
            candidate: candidate
        });

    } catch (error) {

        console.error("Fetch candidate error:", error);

        res.status(500).json({
            message: "Error fetching candidate",
            error: error.message
        });

    }

});


// ==========================================
// CREATE CANDIDATE
// POST /api/candidates
// Protected: Admin only
// Note: Candidates can also be registered at signup
// ==========================================
router.post("/", jwtAuthenticate, adminOnly, async (req, res) => {

    try {

        const { userId, party } = req.body;

        if (!userId || !party) {
            return res.status(400).json({
                message: "User ID and party are required"
            });
        }

        // Verify that the user exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        // Verify user role is 'candidate'
        if (user.role !== "candidate") {
            return res.status(400).json({
                message: "User does not have candidate role. Cannot create candidate profile."
            });
        }

        // Check if user already has a candidate record (One user = One candidate)
        const existingCandidateForUser = await Candidate.findOne({ userId });
        if (existingCandidateForUser) {
            return res.status(400).json({
                message: "This candidate already has a registered candidate profile"
            });
        }

        // Check if party is already represented (One candidate per party)
        const existingParty = await Candidate.findOne({ party: party.trim() });
        if (existingParty) {
            return res.status(400).json({
                message: "A candidate for this party is already registered"
            });
        }

        const candidate = new Candidate({
            userId: user._id,
            name: user.name,
            age: user.age,
            party: party.trim()
        });

        const savedCandidate = await candidate.save();

        res.status(201).json({
            message: "Candidate created successfully",
            candidate: savedCandidate
        });

    } catch (error) {

        console.error("Create candidate error:", error);

        res.status(500).json({
            message: "Error creating candidate",
            error: error.message
        });

    }

});


// ==========================================
// UPDATE CANDIDATE
// PUT /api/candidates/:id
// Protected: Admin only
// SECURITY: Strictly prevents direct voteCount or votes modification!
// ==========================================
router.put("/:id", jwtAuthenticate, adminOnly, async (req, res) => {

    try {

        const candidate = await Candidate.findById(req.params.id);

        if (!candidate) {
            return res.status(404).json({
                message: "Candidate not found"
            });
        }

        // Prepare safe updates
        const updates = { ...req.body };

        // CRITICAL SECURITY: Never allow voteCount, votes, or userId modification
        delete updates.voteCount;
        delete updates.votes;
        delete updates.userId;

        // If updating party, verify uniqueness
        if (updates.party && updates.party.trim() !== candidate.party) {
            const partyExists = await Candidate.findOne({
                party: updates.party.trim(),
                _id: { $ne: req.params.id }
            });

            if (partyExists) {
                return res.status(400).json({
                    message: "A candidate for this party is already registered"
                });
            }

            candidate.party = updates.party.trim();
        }

        if (updates.name) candidate.name = updates.name;
        if (updates.age) candidate.age = updates.age;

        const updatedCandidate = await candidate.save();

        res.status(200).json({
            message: "Candidate updated successfully",
            candidate: updatedCandidate
        });

    } catch (error) {

        console.error("Update candidate error:", error);

        res.status(500).json({
            message: "Error updating candidate",
            error: error.message
        });

    }

});


// ==========================================
// DELETE CANDIDATE
// DELETE /api/candidates/:id
// Protected: Admin only
// ==========================================
router.delete("/:id", jwtAuthenticate, adminOnly, async (req, res) => {

    try {

        const candidate = await Candidate.findByIdAndDelete(req.params.id);

        if (!candidate) {
            return res.status(404).json({
                message: "Candidate not found"
            });
        }

        res.status(200).json({
            message: "Candidate deleted successfully"
        });

    } catch (error) {

        console.error("Delete candidate error:", error);

        res.status(500).json({
            message: "Error deleting candidate",
            error: error.message
        });

    }

});


module.exports = router;