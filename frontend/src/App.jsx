import { useState, useEffect } from "react";
import axios from "axios";
import { FaSpinner, FaPlus, FaTrash } from "react-icons/fa";

export default function App() {
  const [tab, setTab] = useState("register"); // "register" or "admin"
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    college: "",
    branch: "",
    courses: [],
  });
  const [courses, setCourses] = useState([]);
  const [status, setStatus] = useState("");
  const [adminLogin, setAdminLogin] = useState({ username: "", password: "" });
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminStatus, setAdminStatus] = useState("");
  const [newCourse, setNewCourse] = useState("");

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const res = await axios.get("http://localhost:5000/courses");
      setCourses(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("loading");
    try {
      await axios.post("http://localhost:5000/register", formData);
      setStatus("success");
      setFormData({ name: "", email: "", college: "", branch: "", courses: [] });
    } catch (err) {
      setStatus("error");
    }
  };

  const handleAdminLogin = async () => {
    try {
      const res = await axios.post("http://localhost:5000/admin/login", adminLogin);
      if (res.data.success) {
        setIsAdmin(true);
        setAdminStatus("Login successful!");
      } else {
        setAdminStatus("Invalid credentials");
      }
    } catch (err) {
      setAdminStatus("Invalid credentials");
    }
  };

  const addCourse = async () => {
    if (!newCourse.trim()) return;
    try {
      const res = await axios.post("http://localhost:5000/admin/courses", { course: newCourse });
      setCourses(res.data.courses);
      setNewCourse("");
      setAdminStatus("Course added!");
      setTimeout(() => setAdminStatus(""), 3000);
    } catch (err) {
      setAdminStatus("Failed to add course");
    }
  };

  const deleteCourse = async (course) => {
    try {
      const res = await axios.delete(`http://localhost:5000/admin/courses/${encodeURIComponent(course)}`);
      setCourses(res.data.courses);
      setAdminStatus("Course deleted!");
      setTimeout(() => setAdminStatus(""), 3000);
    } catch (err) {
      setAdminStatus("Failed to delete course");
    }
  };

  const handleLogout = () => {
    setIsAdmin(false);
    setAdminLogin({ username: "", password: "" });
    setAdminStatus("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-200 via-pink-200 to-yellow-100 p-6 flex flex-col items-center">
      <h1 className="text-4xl md:text-5xl font-extrabold text-purple-700 mb-8 animate-bounce">
        🌟 Course Portal 🌟
      </h1>

      {/* Tabs */}
      <div className="flex mb-6 space-x-4">
        <button
          className={`px-6 py-2 rounded-xl font-semibold transition ${
            tab === "register" ? "bg-purple-500 text-white" : "bg-white text-purple-700 shadow"
          }`}
          onClick={() => setTab("register")}
        >
          Registration
        </button>
        <button
          className={`px-6 py-2 rounded-xl font-semibold transition ${
            tab === "admin" ? "bg-pink-500 text-white" : "bg-white text-pink-700 shadow"
          }`}
          onClick={() => setTab("admin")}
        >
          Admin Panel
        </button>
      </div>

      {/* Registration Tab */}
      {tab === "register" && (
        <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl p-10 md:p-14 animate-fadeIn">
          <h2 className="text-3xl font-bold text-center mb-8 text-purple-700">User Registration</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <input type="text" name="name" placeholder="Name" value={formData.name} onChange={handleChange} className="p-3 rounded-xl border w-full" required />
            <input type="email" name="email" placeholder="Email" value={formData.email} onChange={handleChange} className="p-3 rounded-xl border w-full" required />
            <input type="text" name="college" placeholder="College" value={formData.college} onChange={handleChange} className="p-3 rounded-xl border w-full md:col-span-2" required />
            <select name="branch" value={formData.branch} onChange={handleChange} className="p-3 rounded-xl border w-full">
              <option value="">Select Branch</option>
              <option value="CSE">CSE</option>
              <option value="ECE">ECE</option>
              <option value="EEE">EEE</option>
              <option value="MECH">MECH</option>
              <option value="CIVIL">CIVIL</option>
            </select>

            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {courses.map((course) => (
                <label key={course} className="flex items-center space-x-2 border p-3 rounded-xl cursor-pointer hover:bg-purple-50 transition">
                  <input type="checkbox" value={course} checked={formData.courses.includes(course)} onChange={(e) => {
                    if (e.target.checked) setFormData({ ...formData, courses: [...formData.courses, course] });
                    else setFormData({ ...formData, courses: formData.courses.filter(c => c !== course) });
                  }} />
                  <span>{course}</span>
                </label>
              ))}
            </div>

            <button type="submit" className="md:col-span-2 bg-purple-600 text-white p-3 rounded-xl mt-4 flex justify-center items-center space-x-2">
              {status === "loading" && <FaSpinner className="animate-spin" />}
              <span>{status === "loading" ? "Submitting..." : "Register"}</span>
            </button>
          </form>

          {status === "success" && <p className="text-green-600 text-center mt-4 animate-bounce">🎉 Registered successfully!</p>}
          {status === "error" && <p className="text-red-600 text-center mt-4 animate-bounce">❌ Something went wrong!</p>}
        </div>
      )}

      {/* Admin Tab */}
      {tab === "admin" && (
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 animate-fadeIn">
          {!isAdmin ? (
            <>
              <h2 className="text-2xl font-bold text-center mb-4 text-pink-700">Admin Login</h2>
              <input type="text" placeholder="Username" value={adminLogin.username} onChange={(e) => setAdminLogin({ ...adminLogin, username: e.target.value })} className="w-full px-4 py-2 mb-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-pink-400" />
              <input type="password" placeholder="Password" value={adminLogin.password} onChange={(e) => setAdminLogin({ ...adminLogin, password: e.target.value })} className="w-full px-4 py-2 mb-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-pink-400" />
              <button onClick={handleAdminLogin} className="w-full bg-pink-500 text-white py-2 rounded-xl hover:bg-pink-600 transition">Login</button>
              {adminStatus && <p className="text-center mt-2 text-green-600">{adminStatus}</p>}
            </>
          ) : (
            <>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-pink-700">Admin Panel</h2>
                <button onClick={handleLogout} className="px-3 py-1 bg-red-500 text-white rounded-xl hover:bg-red-600 transition">
                  Logout
                </button>
              </div>

              <div className="flex mb-4 space-x-2">
                <input type="text" value={newCourse} onChange={(e) => setNewCourse(e.target.value)} placeholder="New course name" className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400" />
                <button onClick={addCourse} className="px-4 py-2 bg-pink-500 text-white rounded-xl hover:bg-pink-600 flex items-center space-x-2"><FaPlus /> <span>Add</span></button>
              </div>

              <ul className="space-y-2">
                {courses.map((course) => (
                  <li key={course} className="flex justify-between items-center bg-pink-50 border border-pink-200 px-3 py-2 rounded-xl">
                    <span className="font-semibold text-pink-700">{course}</span>
                    <button onClick={() => deleteCourse(course)} className="text-red-600 hover:text-red-800 transition"><FaTrash /></button>
                  </li>
                ))}
              </ul>
              {adminStatus && <p className="text-green-600 mt-2">{adminStatus}</p>}
            </>
          )}
        </div>
      )}
    </div>
  );
}
