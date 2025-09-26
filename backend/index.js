require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const nodemailer = require("nodemailer");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");

const app = express();

// ------------------------
// Middleware
// ------------------------
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);
app.use(bodyParser.json());
app.use(cookieParser());

// ------------------------
// MongoDB Setup
// ------------------------
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

const courseSchema = new mongoose.Schema({
  name: { type: String, unique: true, required: true },
  description: { type: String, default: "No description provided" }, // new field
});

const Course = mongoose.model("Course", courseSchema);

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true,required: true ,lowercase: true, trim: true },
  college: { type: String, required: true },
  branch: { type: String, required: true },
  courses: { type: [String], required: true },
  timestamp: { type: Date, default: Date.now },
  status: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending" },
});
const User = mongoose.model("User", userSchema);

// ------------------------
// Nodemailer
// ------------------------
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ------------------------
// Middleware: Verify Admin JWT
// ------------------------
const verifyAdmin = (req, res, next) => {
  const token = req.cookies?.adminToken;
  if (!token) return res.status(401).send({ message: "Unauthorized" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = decoded;
    next();
  } catch {
    res.status(401).send({ message: "Unauthorized" });
  }
};

// ------------------------
// Endpoints
// ------------------------

// Get all courses
app.get("/courses", async (req, res) => {
  try {
    const courses = await Course.find({}, { _id: 0, name: 1, description: 1 }).sort({ name: 1 });
    res.send(courses);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
});

// Admin login
app.post("/admin/login", (req, res) => {
  const { username, password } = req.body;
  if (username === process.env.USER_NAME && password === process.env.PASS_WORD) {
    const token = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: "1d" });
    res.cookie("adminToken", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
    });
    return res.send({ success: true, message: "Login successful" });
  }
  res.status(401).send({ success: false, message: "Invalid credentials" });
});

// Admin logout
app.post("/admin/logout", (req, res) => {
  res.clearCookie("adminToken", { httpOnly: true, sameSite: "lax" });
  res.send({ success: true, message: "Logged out" });
});

// Admin session check
app.get("/admin/check", (req, res) => {
  const token = req.cookies?.adminToken;
  if (!token) return res.send({ loggedIn: false });
  try {
    jwt.verify(token, process.env.JWT_SECRET);
    res.send({ loggedIn: true });
  } catch {
    res.send({ loggedIn: false });
  }
});

// Fetch all users
app.get("/admin/users", verifyAdmin, async (req, res) => {
  try {
    const users = await User.find().sort({ timestamp: -1 });
    res.send(users);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
});

// Update user status
app.post("/admin/users/:id/status", verifyAdmin, async (req, res) => {
  const { status } = req.body;
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).send({ message: "User not found" });

    user.status = status;
    await user.save();

    // Email notification
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: `Registration ${status.toUpperCase()}`,
      text: `Hello ${user.name},\n\nYour registration has been ${status}.\n\nThank you!`,
    });

    res.send({ message: `User ${status} successfully` });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
});

// Add course
app.post("/admin/courses", verifyAdmin, async (req, res) => {
  const { name, description } = req.body;
  try {
    if (!name?.trim()) return res.status(400).send({ message: "Invalid course name" });
    
    const newCourse = new Course({ name: name.trim(), description: description || "No description provided" });
    await newCourse.save();

    const courses = await Course.find({}, { _id: 0, name: 1, description: 1 }).sort({ name: 1 });
    res.send({ courses });
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
});

// Delete course
app.delete("/admin/courses/:courseName", verifyAdmin, async (req, res) => {
  try {
    const courseName = decodeURIComponent(req.params.courseName);
    await Course.deleteOne({ name: courseName });
    const courses = await Course.find({}, { _id: 0, name: 1, description: 1 }).sort({ name: 1 });
    res.send({ courses });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
});

// User registration with validation
app.post("/register", async (req, res) => {
  try {
    const data = req.body;

    // Normalize email
    data.email = data.email.trim().toLowerCase();

    // Extra check before saving
    const existingUser = await User.findOne({ email: data.email });
    if (existingUser) {
      return res.status(400).send({ message: "Email already registered!" });
    }

    const newUser = new User(data);
    await newUser.save();

    res.status(200).send({ message: "Registered successfully, pending approval!" });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).send({ message: err.message });
  }
});

// ------------------------
// Start server
// ------------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
