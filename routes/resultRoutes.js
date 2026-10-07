const express = require("express");
const Candidate = require("../models/candidates");

const router = express.Router();

// GET /api/results
// Public: Returns candidates with name, party, and voteCount sorted by votes
router.get("/", async (req, res) => {

    try {

        const results = await Candidate.find()
            .select("name party voteCount")
            .sort({ voteCount: -1 });

        res.status(200).json({
            results: results
        });

    } catch (error) {

        console.error("Fetch results error:", error);

        res.status(500).json({
            message: "Error fetching election results",
            error: error.message
        });

    }

});

module.exports = router;
