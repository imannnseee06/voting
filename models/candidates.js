const mongoose = require("mongoose");

const CandidateSchema = new mongoose.Schema({

    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true
    },

    name: {
        type: String,
        required: true,
    },

    party: {
        type: String,
        required: true,
        unique: true,
    },

    age: {
        type: Number,
        required: true,
    },

    votes: [
        {
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
                required: true,
            },

            votedAt: {
                type: Date,
                default: Date.now
            }
        }
    ],

    voteCount: {
        type: Number,
        default: 0
    }

});

const Candidate = mongoose.model("Candidate", CandidateSchema);

module.exports = Candidate;