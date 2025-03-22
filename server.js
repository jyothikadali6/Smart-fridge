
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const nodemailer = require("nodemailer");

const app = express();
app.use(express.json());
app.use(cors());
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ Connected to MongoDB"))
    .catch(err => console.error("❌ MongoDB Connection Error:", err));

const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String,
    gender: String
});
const User = mongoose.model("User", userSchema);
const itemSchema = new mongoose.Schema({
    name: String,
    quantity: Number,
    expiry: Date,
    userEmail: String
});
const Item = mongoose.model("Item", itemSchema);
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL,
        pass: process.env.PASSWORD,
    },
});
function generateOTP() {
    return Math.floor(1000 + Math.random() * 9000).toString();
}
const otpStorage = {};
app.post("/signup", async (req, res) => {
    const { name, email, password, gender } = req.body;

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: "Email already exists!" });

        const newUser = new User({ name, email, password, gender });
        await newUser.save();
        res.json({ message: "✅ Signup successful!" });
    } catch (error) {
        res.status(500).json({ message: "❌ Error signing up!" });
    }
});
app.post("/login", async (req, res) => {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ message: "User not found! Redirecting to Signup." });

    const otp = generateOTP();
    otpStorage[email] = otp;

    const mailOptions = {
        from: process.env.EMAIL,
        to: email,
        subject: "Your OTP for Smart Fridge",
        text: `Your OTP is: ${otp}. It is valid for 5 minutes.`,
    };

    transporter.sendMail(mailOptions, (error) => {
        if (error) return res.status(500).json({ message: "❌ Email not sent!" });

        res.json({ message: "✅ OTP sent successfully!", otp });
    });
});
app.post("/verify-otp", (req, res) => {
    const { email, otp } = req.body;

    if (otpStorage[email] === otp) {
        delete otpStorage[email]; // OTP is valid, remove from storage
        res.json({ message: "✅ OTP Verified! Redirecting to Home." });
    } else {
        res.status(400).json({ message: "❌ Invalid OTP!" });
    }
});
app.post("/add-item", async (req, res) => {
    const { name, quantity, expiry, userEmail } = req.body;

    try {
        const newItem = new Item({ name, quantity, expiry, userEmail });
        await newItem.save();
        res.json({ message: "✅ Item added successfully!" });
    } catch (error) {
        res.status(500).json({ message: "❌ Error adding item!" });
    }
});
app.get("/get-items", async (req, res) => {
    const { email } = req.query;

    try {
        const items = await Item.find({ userEmail: email });
        res.json(items);
    } catch (error) {
        res.status(500).json({ message: "❌ Error fetching items!" });
    }
});

app.post("/notify", async (req, res) => {
    const { email, item } = req.body;

    const mailOptions = {
        from: process.env.EMAIL,
        to: email,
        subject: `⚠ Expiry Alert: ${item.name}`,
        text: `Your ${item.name} is about to expire on ${item.expiry}. Please use it soon!`,
    };

    transporter.sendMail(mailOptions, (error) => {
        if (error) return res.status(500).json({ message: "❌ Email not sent!" });

        res.json({ message: "✅ Expiry alert sent successfully!" });
    });
});
app.delete("/delete-item/:id", async (req, res) => {
    try {
        const { id } = req.params;
        await Item.findByIdAndDelete(id);
        res.json({ message: "✅ Item deleted successfully!" });
    } catch (error) {
        res.status(500).json({ message: "❌ Error deleting item!" });
    }
});
async function checkExpiry() {
    const items = await Item.find();
    const today = new Date();

    items.forEach(async (item) => {
        const expiryDate = new Date(item.expiry);
        const diff = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));

        if (diff <= 2) {
            const mailOptions = {
                from: process.env.EMAIL,
                to: item.userEmail,
                subject: `⚠ Expiry Alert: ${item.name}`,
                text: `Your ${item.name} is about to expire on ${item.expiry}. Please use it soon!`,
            };

            transporter.sendMail(mailOptions, (error) => {
                if (error) console.error("❌ Email not sent for expiry alert!", error);
                else console.log(`✅ Expiry alert sent for ${item.name}`);
            });
        }
    });
}
setInterval(checkExpiry, 24 * 60 * 60 * 1000);
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));


