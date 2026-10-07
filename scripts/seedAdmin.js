const mongoose = require("mongoose");
const dotenv = require("dotenv");
const User = require("../models/user");

// Load environment variables
dotenv.config();

const seedAdmin = async () => {

    try {

        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB for seeding...");

        // Check if an admin already exists (ONLY ONE admin rule)
        const existingAdmin = await User.findOne({ role: "admin" });

        if (existingAdmin) {
            console.log("An admin account already exists:");
            console.log(`- Aadhaar: ${existingAdmin.aadharCardNumber}`);
            console.log(`- Email: ${existingAdmin.email}`);
            process.exit(0);
        }

        // Admin default credentials
        const adminData = {
            name: "Election Admin",
            age: 40,
            mobile: "9999999999",
            email: "admin@voting.gov",
            address: "Election Commission Central HQ",
            aadharCardNumber: "000000000000",
            password: "adminpassword123",
            role: "admin"
        };

        const admin = new User(adminData);
        await admin.save();

        console.log("========================================");
        console.log("Admin account created successfully!");
        console.log("========================================");
        console.log(`Aadhaar Card Number : ${adminData.aadharCardNumber}`);
        console.log(`Password            : ${adminData.password}`);
        console.log(`Role                : ${adminData.role}`);
        console.log("========================================");

        await mongoose.disconnect();
        process.exit(0);

    } catch (error) {

        console.error("Error seeding admin:", error.message);
        process.exit(1);

    }

};

seedAdmin();
