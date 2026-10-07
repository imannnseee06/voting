const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({

    name: {
        type: String,
        required: true
    },

    age: {
        type: Number,
        required: true
    },

    mobile: {
        type: String,
        required: true
    },

    email: {
        type: String,
        required: true,
        unique: true
    },

    address: {
        type: String,
        required: true
    },

    aadharCardNumber: {
        type: String,
        required: true,
        unique: true
    },

    password: {
        type: String,
        required: true
    },

    role: {
        type: String,
        enum: ["voter", "candidate", "admin"],
        default: "voter"
    },

    isVoted: {
        type: Boolean,
        default: false
    }

});


// Hash password before saving
userSchema.pre("save", async function () {

    if (!this.isModified("password")) {
        return;
    }

    const salt = await bcrypt.genSalt(10);

    this.password = await bcrypt.hash(
        this.password,
        salt
    );
});


// Compare password during login
userSchema.methods.comparePassword = async function (password) {

    return await bcrypt.compare(
        password,
        this.password
    );

};



// Create User model
const User = mongoose.model("User", userSchema);

module.exports = User;