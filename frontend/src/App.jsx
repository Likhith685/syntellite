import { useState, useEffect } from "react";
import axios from "axios";
import { FaSpinner, FaPlus, FaTrash } from "react-icons/fa";
import jsPDF from "jspdf";

export default function App() {
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

  // ------------------------
  // Persistent tab state using localStorage
  // ------------------------
  const [tab, setTab] = useState(() => localStorage.getItem("selectedTab") || "register");

  const [formData, setFormData] = useState({
    name: "", email: "", college: "", branch: "", courses: []
  });
  const [courses, setCourses] = useState([]);
  const [status, setStatus] = useState("");

  const [adminLogin, setAdminLogin] = useState({ username: "", password: "" });
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState([]);
  const [newCourse, setNewCourse] = useState("");
  const [adminStatus, setAdminStatus] = useState("");
  const [newCourseDesc, setNewCourseDesc] = useState(""); // new state

  const [selectedCourse, setSelectedCourse] = useState(null); // for course PDF viewer

  // ------------------------
  // Save tab selection to localStorage
  // ------------------------
  const handleTabChange = (newTab) => {
    setTab(newTab);
    localStorage.setItem("selectedTab", newTab);
  };

  // ------------------------
  // Fetch courses and check admin session on mount
  // ------------------------
  useEffect(() => {
    fetchCourses();

    const checkAdminSession = async () => {
      try {
        const res = await axios.get(`${BACKEND_URL}/admin/check`, { withCredentials: true });
        if (res.data.loggedIn) {
          setIsAdmin(true);
          fetchUsers();
          handleTabChange("admin"); // automatically go to admin tab if logged in
        } else {
          handleTabChange("register");
        }
      } catch (err) {
        console.error(err);
      }
    };

    checkAdminSession();
  }, []);

  const fetchCourses = async () => {
  try {
    const res = await axios.get(`${BACKEND_URL}/courses`);
    setCourses(res.data.map(c => ({
      name: c.name,
      description: c.description || "No description available."
    })));
  } catch (err) {
    console.error(err);
  }
};

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/admin/users`, { withCredentials: true });
      setUsers(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  // ------------------------
  // Registration
  // ------------------------
  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await axios.post(`${BACKEND_URL}/register`, formData);
      setStatus("success");
      setFormData({ name: "", email: "", college: "", branch: "", courses: [] });
    } catch (err) {
      console.error(err.response?.data?.message || err.message);
      setStatus("error");
    }
  };

  // ------------------------
  // Admin
  // ------------------------
  const handleAdminLogin = async () => {
    try {
      const res = await axios.post(`${BACKEND_URL}/admin/login`, adminLogin, { withCredentials: true });
      if (res.data.success) {
        setIsAdmin(true);
        fetchUsers();
        setAdminStatus("Login successful!");
        handleTabChange("admin");
      } else setAdminStatus("Invalid credentials");
    } catch {
      setAdminStatus("Invalid credentials");
    }
  };

  const handleLogout = async () => {
    await axios.post(`${BACKEND_URL}/admin/logout`, {}, { withCredentials: true });
    setIsAdmin(false);
    setAdminLogin({ username: "", password: "" });
    setUsers([]);
    setAdminStatus("");
    handleTabChange("register"); // switch back to registration
  };

  const handleUserStatus = async (id, status) => {
    try {
      await axios.post(`${BACKEND_URL}/admin/users/${id}/status`, { status }, { withCredentials: true });
      setUsers(users.map(u => u._id === id ? { ...u, status } : u));
    } catch (err) {
      console.error(err);
    }
  };

  const addCourse = async () => {
  if (!newCourse.trim()) return;
  try {
    const res = await axios.post(
      `${BACKEND_URL}/admin/courses`,
      { name: newCourse, description: newCourseDesc },  // send both
      { withCredentials: true }
    );
    setCourses(res.data.courses);
    setNewCourse("");
    setNewCourseDesc("");   // reset description too
    setAdminStatus("Course added!");
    setTimeout(() => setAdminStatus(""), 3000);
  } catch {
    setAdminStatus("Failed to add course");
  }
};

  const deleteCourse = async (course) => {
    try {
      const res = await axios.delete(`${BACKEND_URL}/admin/courses/${encodeURIComponent(course.name || course)}`, { withCredentials: true });
      setCourses(res.data.courses);
      setAdminStatus("Course deleted!");
      setTimeout(() => setAdminStatus(""), 3000);
      if (selectedCourse && selectedCourse.name === (course.name || course)) setSelectedCourse(null);
    } catch {
      setAdminStatus("Failed to delete course");
    }
  };

  // ------------------------
  // PDF Generation
  // ------------------------
  const downloadCoursePDF = (course) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(course.name, 14, 22);

    doc.setFontSize(12);
    doc.text(course.description || "No description available.", 14, 32);

    doc.save(`${course.name}.pdf`);
  };

  // ------------------------
  // UI
  // ------------------------
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-200 via-pink-200 to-yellow-100 p-6 flex flex-col items-center">
      <h1 className="text-4xl md:text-5xl font-extrabold text-purple-700 mb-8 animate-bounce">🌟 Course Portal 🌟</h1>

      <div className="flex mb-6 space-x-4">
        <button className={`px-6 py-2 rounded-xl font-semibold transition ${tab === "register" ? "bg-purple-500 text-white" : "bg-white text-purple-700 shadow"}`} onClick={() => handleTabChange("register")}>Registration</button>
        <button className={`px-6 py-2 rounded-xl font-semibold transition ${tab === "admin" ? "bg-pink-500 text-white" : "bg-white text-pink-700 shadow"}`} onClick={() => handleTabChange("admin")}>Admin Panel</button>
      </div>

      {/* Registration Form */}
      {tab === "register" && (
        <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl p-10 md:p-14">
          <h2 className="text-3xl font-bold text-center mb-8 text-purple-700">User Registration</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <input type="text" name="name" placeholder="Name" value={formData.name} onChange={handleChange} className="p-3 rounded-xl border w-full" required />
            <input type="email" name="email" placeholder="Email" value={formData.email} onChange={handleChange} className="p-3 rounded-xl border w-full" required />
            <input type="text" name="college" placeholder="College" value={formData.college} onChange={handleChange} className="p-3 rounded-xl border w-full md:col-span-2" required />
            <select name="branch" value={formData.branch} onChange={handleChange} className="p-3 rounded-xl border w-full" required>
              <option value="">Select Branch</option>
              <option value="CSE">CSE</option>
              <option value="ECE">ECE</option>
              <option value="EEE">EEE</option>
              <option value="MECH">MECH</option>
              <option value="CIVIL">CIVIL</option>
            </select>
           <div className="md:col-span-2">
  {/* Section Title */}
  <h1 className="text-3xl font-extrabold text-gray-900 mb-6 text-center md:text-left">
    Courses
  </h1>

  {/* Courses Grid */}
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
    {courses.map(course => (
      <label
        key={course.name}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between border border-gray-200 p-4 rounded-xl cursor-pointer hover:shadow-lg hover:bg-purple-50 transition-all duration-200"
      >
        {/* Left: Checkbox + Course Name */}
        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            value={course.name}
            checked={formData.courses.includes(course.name)}
            onChange={e => {
              if (e.target.checked) {
                setFormData({ ...formData, courses: [...formData.courses, course.name] });
              } else {
                setFormData({ ...formData, courses: formData.courses.filter(c => c !== course.name) });
              }
            }}
            className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
          />
          <span className="font-medium text-gray-800">{course.name}</span>
        </div>

        {/* Right: Download PDF */}
        <button
          type="button"
          onClick={() => downloadCoursePDF(course)}
          className="mt-3 sm:mt-0 sm:ml-4 px-3 py-1 text-sm font-semibold text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
        >
          Download PDF
        </button>
      </label>
    ))}
  </div>
</div>

            <button type="submit" className="md:col-span-2 bg-purple-600 text-white p-3 rounded-xl mt-4">Register</button>
          </form>
          {status === "success" && <p className="text-green-600 text-center mt-4 animate-bounce">🎉 Registered successfully!</p>}
          {status === "error" && <p className="text-red-600 text-center mt-4 animate-bounce">❌ Something went wrong!</p>}
        </div>
      )}

      {/* Admin Panel */}
      {tab === "admin" && (
        <div className="w-full max-w-5xl bg-white rounded-2xl shadow p-6">
          {!isAdmin ? (
            <div className="max-w-md mx-auto">
              <h2 className="text-2xl font-bold text-center mb-4 text-pink-700">Admin Login</h2>
              <input type="text" placeholder="Username" value={adminLogin.username} onChange={e => setAdminLogin({ ...adminLogin, username: e.target.value })} className="w-full px-4 py-2 mb-3 rounded-xl border" />
              <input type="password" placeholder="Password" value={adminLogin.password} onChange={e => setAdminLogin({ ...adminLogin, password: e.target.value })} className="w-full px-4 py-2 mb-3 rounded-xl border" />
              <button onClick={handleAdminLogin} className="w-full bg-pink-500 text-white py-2 rounded-xl">Login</button>
              {adminStatus && <p className="text-center mt-2 text-green-600">{adminStatus}</p>}
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-pink-700">Admin Dashboard</h2>
                <button onClick={handleLogout} className="px-3 py-1 bg-red-500 text-white rounded-xl">Logout</button>
              </div>

              {/* Users Table */}
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="p-2">Name</th>
                    <th>Email</th>
                    <th>College</th>
                    <th>Branch</th>
                    <th>Courses</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user._id} className="border-b">
                      <td className="p-2">{user.name}</td>
                      <td className="p-2">{user.email}</td>
                      <td className="p-2">{user.college}</td>
                      <td className="p-2">{user.branch}</td>
                      <td className="p-2">{user.courses.join(", ")}</td>
                      <td className="p-2">{user.status}</td>
                      <td className="p-2 space-x-2">
                        {user.status === "pending" && <>
                          <button onClick={() => handleUserStatus(user._id, "accepted")} className="px-2 py-1 bg-green-500 text-white rounded">Accept</button>
                          <button onClick={() => handleUserStatus(user._id, "rejected")} className="px-2 py-1 bg-red-500 text-white rounded">Reject</button>
                        </>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Course Management */}
              <div className="mt-6">
                <h3 className="font-bold text-pink-700 mb-2">Manage Courses</h3>
                <div className="flex flex-col md:flex-row mb-4 gap-2">
  <input
    type="text"
    value={newCourse}
    onChange={e => setNewCourse(e.target.value)}
    placeholder="Course name"
    className="w-full px-3 py-2 border rounded-xl"
  />
  <input
    type="text"
    value={newCourseDesc}
    onChange={e => setNewCourseDesc(e.target.value)}
    placeholder="Course description"
    className="w-full px-3 py-2 border rounded-xl"
  />
  <button
    onClick={addCourse}
    className="px-4 py-2 bg-pink-500 text-white rounded-xl"
  >
    Add
  </button>
</div>


                <ul className="space-y-2">
                  {courses.map(course => (
                    <li key={course.name || course} className="flex justify-between items-center bg-pink-50 border border-pink-200 px-3 py-2 rounded-xl cursor-pointer hover:bg-pink-100"
                        onClick={() => setSelectedCourse(course)}>
                      <span className="font-semibold text-pink-700">{course.name || course}</span>
                      <button onClick={(e) => { e.stopPropagation(); deleteCourse(course); }} className="text-red-600">Delete</button>
                    </li>
                  ))}
                </ul>

                {selectedCourse && (
                  <div className="mt-4 p-4 border rounded-xl bg-pink-50 w-full">
                    <h4 className="text-xl font-bold text-pink-700">{selectedCourse.name}</h4>
                    <p className="mt-2">{selectedCourse.description || "No description available."}</p>
                    <button
                      onClick={() => downloadCoursePDF(selectedCourse)}
                      className="mt-3 px-4 py-2 bg-blue-500 text-white rounded-xl"
                    >
                      Download PDF
                    </button>
                  </div>
                )}

                {adminStatus && <p className="text-green-600 mt-2">{adminStatus}</p>}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
