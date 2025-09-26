require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { google } = require("googleapis");
const nodemailer = require("nodemailer");
const mongoose = require("mongoose");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// ------------------------
// MongoDB Setup
// ------------------------
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

const courseSchema = new mongoose.Schema({ name: { type: String, unique: true } });
const Course = mongoose.model("Course", courseSchema);

// ------------------------
// Google Sheets Setup
// ------------------------
async function appendToSheet(data) {
  const auth = new google.auth.GoogleAuth({
    keyFile: "credentials.json",
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth: await auth.getClient() });
  const spreadsheetId = process.env.SPREADSHEET_ID;

  const coursesStr = Array.isArray(data.courses) ? data.courses.join(", ") : data.courses;

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: "Sheet1!A:E",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[data.name, data.email, data.college, data.branch, coursesStr]],
    },
  });
}

// ------------------------
// Nodemailer Setup
// ------------------------
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ------------------------
// Endpoints
// ------------------------

// 1️⃣ Get available courses
app.get("/courses", async (req, res) => {
  try {
    const courses = await Course.find({}, { _id: 0, name: 1 }).sort({ name: 1 });
    res.send(courses.map(c => c.name));
  } catch (err) {
    res.status(500).send({ message: "Error fetching courses", error: err.message });
  }
});

// 2️⃣ Admin login
app.post("/admin/login", (req, res) => {
  const { username, password } = req.body;
  if (username === process.env.USER_NAME && password === process.env.PASS_WORD) {
    return res.send({ success: true, message: "Login successful" });
  }
  res.status(401).send({ success: false, message: "Invalid credentials" });
});

// 3️⃣ Admin add course
app.post("/admin/courses", async (req, res) => {
  const { course } = req.body;
  try {
    if (!course?.trim()) return res.status(400).send({ message: "Invalid course name" });

    const newCourse = new Course({ name: course.trim() });
    await newCourse.save();

    const courses = await Course.find({}, { _id: 0, name: 1 }).sort({ name: 1 });
    res.send({ message: "Course added", courses: courses.map(c => c.name) });
  } catch (err) {
    res.status(400).send({ message: "Duplicate or invalid course", error: err.message });
  }
});

// 4️⃣ Admin delete course
app.delete("/admin/courses/:courseName", async (req, res) => {
  const courseName = decodeURIComponent(req.params.courseName);
  try {
    await Course.deleteOne({ name: courseName });
    const courses = await Course.find({}, { _id: 0, name: 1 }).sort({ name: 1 });
    res.send({ message: "Course deleted", courses: courses.map(c => c.name) });
  } catch (err) {
    res.status(500).send({ message: "Error deleting course", error: err.message });
  }
});

// 5️⃣ User registration
app.post("/register", async (req, res) => {
  const data = req.body;
  try {
    await appendToSheet(data);

    const coursesStr = Array.isArray(data.courses) ? data.courses.join(", ") : data.courses;
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: data.email,
      subject: "Course Registration Successful",
      text: `Hello ${data.name},\n\nYou have successfully registered for the following courses:\n${coursesStr}\n\nThank you!`,
    });

    res.status(200).send({ message: "Registered successfully!" });
  } catch (err) {
    res.status(500).send({ message: "Error occurred.", error: err.message });
  }
});

// ------------------------
// Start Server
// ------------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
