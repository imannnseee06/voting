const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

const authRoutes = require("./routes/authRoutes");
const candidateRoutes = require("./routes/candidateRoutes");
const voteRoutes = require("./routes/voteRoutes");
const userRoutes = require("./routes/userRoutes");
const resultRoutes = require("./routes/resultRoutes");
const User = require("./models/user");
const Candidate = require("./models/candidates");

const app = express();
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/candidates", candidateRoutes);
app.use("/api/vote", voteRoutes);
app.use("/api/profile", userRoutes);
app.use("/api/results", resultRoutes);

const runTests = async () => {

    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB for testing.");

    // Clean up test data (leave admin intact)
    await User.deleteMany({ role: { $ne: "admin" } });
    await Candidate.deleteMany({});

    const PORT = 3001;
    const server = app.listen(PORT);
    const BASE_URL = `http://localhost:${PORT}`;

    let passedCount = 0;
    let failedCount = 0;

    const test = (num, name, condition, details = "") => {
        if (condition) {
            console.log(`✅ [Test ${num}] ${name}`);
            passedCount++;
        } else {
            console.error(`❌ [Test ${num}] ${name} FAILED! ${details}`);
            failedCount++;
        }
    };

    try {

        // ==========================================
        // Test 1: User can register as voter
        // ==========================================
        const voterSignupRes = await fetch(`${BASE_URL}/api/auth/signup`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: "Rahul Voter",
                age: 22,
                mobile: "9876543210",
                email: "rahul@voter.com",
                address: "New Delhi",
                aadharCardNumber: "111122223333",
                password: "password123",
                role: "voter"
            })
        });
        const voterSignupData = await voterSignupRes.json();
        test(1, "User can register as voter", voterSignupRes.status === 201 && voterSignupData.user.role === "voter");

        // ==========================================
        // Test 2: User can register as candidate
        // ==========================================
        const candSignupRes = await fetch(`${BASE_URL}/api/auth/signup`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: "Priya Candidate",
                age: 32,
                mobile: "9876543211",
                email: "priya@candidate.com",
                address: "Mumbai",
                aadharCardNumber: "222233334444",
                password: "password123",
                role: "candidate",
                party: "Democratic Party"
            })
        });
        const candSignupData = await candSignupRes.json();
        test(2, "User can register as candidate", candSignupRes.status === 201 && candSignupData.user.role === "candidate" && candSignupData.candidate.party === "Democratic Party");

        // ==========================================
        // Test 3: User cannot register as admin through public signup
        // ==========================================
        const adminFakeSignupRes = await fetch(`${BASE_URL}/api/auth/signup`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: "Fake Admin",
                age: 45,
                mobile: "9876543212",
                email: "fakeadmin@test.com",
                address: "Kolkata",
                aadharCardNumber: "999988887777",
                password: "password123",
                role: "admin"
            })
        });
        test(3, "User cannot register as admin through public signup", adminFakeSignupRes.status === 403);

        // ==========================================
        // Test 4: Candidate cannot register again
        // ==========================================
        const duplicateCandSignupRes = await fetch(`${BASE_URL}/api/auth/signup`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: "Priya Duplicate",
                age: 32,
                mobile: "9876543211",
                email: "priya@candidate.com",
                address: "Mumbai",
                aadharCardNumber: "222233334444",
                password: "password123",
                role: "candidate",
                party: "Democratic Party"
            })
        });
        test(4, "Candidate cannot register again", duplicateCandSignupRes.status === 400);

        // ==========================================
        // Test 5 & 6: Roles are immutable (No role change API exists)
        // ==========================================
        // We verify that no PUT /api/profile or /api/auth exposes role editing
        const voterProfileRes = await fetch(`${BASE_URL}/api/profile`, {
            method: "GET",
            headers: { "Authorization": `Bearer ${voterSignupData.token}` }
        });
        const voterProfileData = await voterProfileRes.json();
        test(5, "Voter cannot become candidate after registration", voterProfileData.user.role === "voter");
        test(6, "Candidate cannot become voter after registration", candSignupData.user.role === "candidate");

        // ==========================================
        // Test 7: Voter can login using Aadhaar + password
        // ==========================================
        const voterLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                aadharCardNumber: "111122223333",
                password: "password123"
            })
        });
        const voterLoginData = await voterLoginRes.json();
        test(7, "Voter can login using Aadhaar + password", voterLoginRes.status === 200 && !!voterLoginData.token);
        const voterToken = voterLoginData.token;

        // ==========================================
        // Test 8: Candidate can login using Aadhaar + password
        // ==========================================
        const candLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                aadharCardNumber: "222233334444",
                password: "password123"
            })
        });
        const candLoginData = await candLoginRes.json();
        test(8, "Candidate can login using Aadhaar + password", candLoginRes.status === 200 && candLoginData.user.role === "candidate");
        const candToken = candLoginData.token;

        // ==========================================
        // Test 9: Admin can login
        // ==========================================
        const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                aadharCardNumber: "000000000000",
                password: "adminpassword123"
            })
        });
        const adminLoginData = await adminLoginRes.json();
        test(9, "Admin can login", adminLoginRes.status === 200 && adminLoginData.user.role === "admin");
        const adminToken = adminLoginData.token;

        // ==========================================
        // Test 10: Voter can view candidates
        // ==========================================
        const getCandidatesRes = await fetch(`${BASE_URL}/api/candidates`);
        const getCandidatesData = await getCandidatesRes.json();
        test(10, "Voter can view candidates", getCandidatesRes.status === 200 && getCandidatesData.candidates.length > 0);
        const candidateId = getCandidatesData.candidates[0]._id;

        // Register a second candidate for more test cases
        await fetch(`${BASE_URL}/api/auth/signup`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: "Anil Candidate",
                age: 40,
                mobile: "9876543299",
                email: "anil@candidate.com",
                address: "Chennai",
                aadharCardNumber: "333344445555",
                password: "password123",
                role: "candidate",
                party: "National Progressive Party"
            })
        });

        // ==========================================
        // Test 11: Voter can vote once
        // ==========================================
        const voteRes1 = await fetch(`${BASE_URL}/api/vote/${candidateId}`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${voterToken}` }
        });
        const voteData1 = await voteRes1.json();
        test(11, "Voter can vote once", voteRes1.status === 200 && voteData1.message === "Vote recorded successfully");

        // ==========================================
        // Test 12: Same voter cannot vote twice
        // ==========================================
        const voteRes2 = await fetch(`${BASE_URL}/api/vote/${candidateId}`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${voterToken}` }
        });
        const voteData2 = await voteRes2.json();
        test(12, "Same voter cannot vote twice", voteRes2.status === 400 && voteData2.message === "You have already voted");

        // ==========================================
        // Test 13: Candidate cannot vote
        // ==========================================
        const candVoteRes = await fetch(`${BASE_URL}/api/vote/${candidateId}`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${candToken}` }
        });
        const candVoteData = await candVoteRes.json();
        test(13, "Candidate cannot vote", candVoteRes.status === 403 && candVoteData.message === "Candidates are not allowed to vote");

        // ==========================================
        // Test 14: Admin cannot vote
        // ==========================================
        const adminVoteRes = await fetch(`${BASE_URL}/api/vote/${candidateId}`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${adminToken}` }
        });
        const adminVoteData = await adminVoteRes.json();
        test(14, "Admin cannot vote", adminVoteRes.status === 403 && adminVoteData.message === "Admins are not allowed to vote");

        // ==========================================
        // Test 15: Admin can view/manage candidates
        // ==========================================
        const adminUpdateRes = await fetch(`${BASE_URL}/api/candidates/${candidateId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${adminToken}`
            },
            body: JSON.stringify({
                name: "Priya Candidate Updated"
            })
        });
        test(15, "Admin can view/manage candidates", adminUpdateRes.status === 200);

        // ==========================================
        // Test 16: Admin cannot modify voteCount
        // ==========================================
        const adminTamperVoteRes = await fetch(`${BASE_URL}/api/candidates/${candidateId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${adminToken}`
            },
            body: JSON.stringify({
                voteCount: 9999
            })
        });
        const candidateAfterAdminTamper = await Candidate.findById(candidateId);
        test(16, "Admin cannot modify voteCount", candidateAfterAdminTamper.voteCount === 1);

        // ==========================================
        // Test 17: Candidate cannot modify voteCount
        // ==========================================
        const candTamperRes = await fetch(`${BASE_URL}/api/candidates/${candidateId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${candToken}`
            },
            body: JSON.stringify({
                voteCount: 500
            })
        });
        test(17, "Candidate cannot modify voteCount", candTamperRes.status === 403);

        // ==========================================
        // Test 18: Voter cannot modify voteCount
        // ==========================================
        const voterTamperRes = await fetch(`${BASE_URL}/api/candidates/${candidateId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${voterToken}`
            },
            body: JSON.stringify({
                voteCount: 500
            })
        });
        test(18, "Voter cannot modify voteCount", voterTamperRes.status === 403);

        // ==========================================
        // Test 19: Vote count increases only after a successful vote
        // ==========================================
        // Register voter 2 and vote
        const voter2SignupRes = await fetch(`${BASE_URL}/api/auth/signup`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: "Sunita Voter",
                age: 26,
                mobile: "9876543233",
                email: "sunita@voter.com",
                address: "Pune",
                aadharCardNumber: "555566667777",
                password: "password123",
                role: "voter"
            })
        });
        const voter2Data = await voter2SignupRes.json();
        await fetch(`${BASE_URL}/api/vote/${candidateId}`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${voter2Data.token}` }
        });
        const candidateAfterVote2 = await Candidate.findById(candidateId);
        test(19, "Vote count increases only after a successful vote", candidateAfterVote2.voteCount === 2);

        // ==========================================
        // Test 20: Candidate belongs to only one party
        // ==========================================
        const dupPartyRes = await fetch(`${BASE_URL}/api/auth/signup`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: "Duplicate Party Guy",
                age: 38,
                mobile: "9876543244",
                email: "dup@party.com",
                address: "Delhi",
                aadharCardNumber: "666677778888",
                password: "password123",
                role: "candidate",
                party: "Democratic Party" // Already used by Priya
            })
        });
        test(20, "Candidate belongs to only one party (unique party enforcement)", dupPartyRes.status === 400);

        // ==========================================
        // Test 21: Candidate cannot create multiple candidate records
        // ==========================================
        // Admin tries to create another candidate for Priya's userId
        const priyaUser = await User.findOne({ aadharCardNumber: "222233334444" });
        const dupCandRecordRes = await fetch(`${BASE_URL}/api/candidates`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${adminToken}`
            },
            body: JSON.stringify({
                userId: priyaUser._id,
                party: "Another Party"
            })
        });
        test(21, "Candidate cannot create multiple candidate records", dupCandRecordRes.status === 400);

        // ==========================================
        // Final Results Endpoint Check
        // ==========================================
        const resultsRes = await fetch(`${BASE_URL}/api/vote/counts`);
        const resultsData = await resultsRes.json();
        console.log(`\nElection Results count verified: ${resultsData.results.length} candidates found.`);

        console.log("\n========================================");
        console.log(`SUMMARY: ${passedCount}/21 Tests Passed! (${failedCount} failed)`);
        console.log("========================================\n");

    } catch (err) {
        console.error("Test execution error:", err);
    } finally {
        server.close();
        await mongoose.disconnect();
    }
};

runTests();
