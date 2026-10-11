import { useEffect, useState } from "react";
import "./App.css";
import { API_BASE_URL } from "./config";

const defaultTasks = [
  {
    _id: "1",
    title: "Design landing page",
    category: "Work",
    priority: "High",
    due_date: "Today",
    completed: false,
  },
  {
    _id: "2",
    title: "Review English lesson notes",
    category: "Study",
    priority: "Medium",
    due_date: "Tomorrow",
    completed: true,
  },
  {
    _id: "3",
    title: "Grocery run for the week",
    category: "Personal",
    priority: "Low",
    due_date: "Wed 12",
    completed: false,
  },
];

function App() {

  // =====================================================
  // AUTHENTICATION
  // =====================================================

  const [user, setUser] = useState(() => {
    try {
      const savedUser =
        localStorage.getItem("taskflowUser");

      return savedUser
        ? JSON.parse(savedUser)
        : null;
    } catch {
      return null;
    }
  });

  const [authMode, setAuthMode] = useState("login");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);


  // =====================================================
  // TASK STATES
  // =====================================================

  const [tasks, setTasks] = useState(defaultTasks);

  const [title, setTitle] = useState("");
  const [category, setCategory] =
    useState("Personal");

  const [priority, setPriority] =
    useState("Medium");

  const [dueDate, setDueDate] = useState("");

  const [search, setSearch] = useState("");

  const [filter, setFilter] =
    useState("all");

  const [showAddTask, setShowAddTask] =
    useState(false);

  // =====================================================
  // GOOGLE CALENDAR STATES
  // =====================================================

  const [googleTasks, setGoogleTasks] = useState([]);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showGoogleCalendar, setShowGoogleCalendar] = useState(true);
  const [addToGoogleCalendar, setAddToGoogleCalendar] = useState(false);


  // =====================================================
  // LOGIN / REGISTER
  // =====================================================

  const handleAuth = async (e) => {
    e.preventDefault();

    setAuthError("");
    setAuthLoading(true);

    const endpoint =
      authMode === "login"
        ? "/api/auth/login"
        : "/api/auth/register";

    const payload =
      authMode === "login"
        ? {
            email: email.trim(),
            password,
          }
        : {
            name: name.trim(),
            email: email.trim(),
            password,
          };

    try {

      const response = await fetch(
        `${API_BASE_URL}${endpoint}`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify(payload),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
          "Authentication failed"
        );
      }

      // Save login token
      localStorage.setItem(
        "taskflowToken",
        data.token
      );

      // Save user information
      localStorage.setItem(
        "taskflowUser",
        JSON.stringify(data.user)
      );

      setUser(data.user);

      // Clear form
      setName("");
      setEmail("");
      setPassword("");
      setAuthError("");

    } catch (error) {

      console.error(
        "Authentication error:",
        error
      );

      setAuthError(
        error.message ||
        "Something went wrong"
      );

    } finally {

      setAuthLoading(false);
    }
  };


  // =====================================================
  // LOGOUT
  // =====================================================

  const logout = () => {

    localStorage.removeItem(
      "taskflowToken"
    );

    localStorage.removeItem(
      "taskflowUser"
    );

    setUser(null);

    setTasks(defaultTasks);
    setFilter("all");
    setSearch("");
  };


  // =====================================================
  // GOOGLE OAUTH REDIRECT HANDLER
  // =====================================================

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const userParam = params.get("user");
    const errorParam = params.get("error");

    if (token && userParam) {
      try {
        const parsedUser = JSON.parse(decodeURIComponent(userParam));
        localStorage.setItem("taskflowToken", token);
        localStorage.setItem("taskflowUser", JSON.stringify(parsedUser));
        setUser(parsedUser);
      } catch (err) {
        console.error("Failed to parse user redirect parameter:", err);
      }
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (errorParam) {
      setAuthError(decodeURIComponent(errorParam));
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // =====================================================
  // FETCH TASKS
  // =====================================================

  useEffect(() => {

    if (!user) {
      return;
    }

    const token =
      localStorage.getItem(
        "taskflowToken"
      );

    fetch(
      `${API_BASE_URL}/api/tasks`,
      {
        headers: token
          ? {
              Authorization:
                `Bearer ${token}`,
            }
          : {},
      }
    )
      .then((response) => {

        if (!response.ok) {
          throw new Error(
            "Failed to fetch tasks"
          );
        }

        return response.json();
      })
      .then((data) => {

        if (Array.isArray(data)) {
          setTasks(data);
        }

      })
      .catch((error) => {

        console.error(
          "Failed to fetch tasks:",
          error
        );

      });

  }, [user]);

  // =====================================================
  // FETCH GOOGLE CALENDAR EVENTS
  // =====================================================

  const fetchGoogleTasks = async () => {
    if (!user || !user.googleConnected) {
      setGoogleTasks([]);
      return;
    }

    setGoogleLoading(true);
    try {
      const token = localStorage.getItem("taskflowToken");
      const response = await fetch(`${API_BASE_URL}/api/calendar/events`, {
        headers: token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {},
      });

      if (!response.ok) {
        throw new Error("Failed to fetch Google Calendar tasks");
      }

      const data = await response.json();
      if (Array.isArray(data)) {
        setGoogleTasks(data);
      }
    } catch (error) {
      console.error("Failed to fetch Google Calendar tasks:", error);
    } finally {
      setGoogleLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.googleConnected) {
      fetchGoogleTasks();
    } else {
      setGoogleTasks([]);
    }
  }, [user]);

  const handleDisconnectGoogle = async () => {
    if (!window.confirm("Are you sure you want to disconnect Google Calendar?")) return;

    try {
      const token = localStorage.getItem("taskflowToken");
      const response = await fetch(`${API_BASE_URL}/api/auth/google/disconnect`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        localStorage.setItem("taskflowUser", JSON.stringify(data.user));
        setGoogleTasks([]);
      } else {
        alert("Failed to disconnect Google Calendar");
      }
    } catch (error) {
      console.error("Error disconnecting Google Calendar:", error);
    }
  };

  const handleConnectGoogle = () => {
    const token = localStorage.getItem("taskflowToken");
    window.location.href = `${API_BASE_URL}/api/auth/google?state=${token}`;
  };


  // =====================================================
  // ADD TASK
  // =====================================================

  const addTask = async (e) => {

    e.preventDefault();

    if (!title.trim()) {
      return;
    }

    const payload = {
      title: title.trim(),
      category,
      priority,
      due_date: dueDate,
      completed: false,
      addToGoogleCalendar: user.googleConnected ? addToGoogleCalendar : false
    };

    try {

      const token =
        localStorage.getItem(
          "taskflowToken"
        );

      const response = await fetch(
        `${API_BASE_URL}/api/tasks`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            ...(token
              ? {
                  Authorization:
                    `Bearer ${token}`,
                }
              : {}),
          },

          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        throw new Error(
          "Failed to create task"
        );
      }

      const newTask =
        await response.json();

      if (newTask && newTask._id) {

        setTasks((prev) => [
          newTask,
          ...prev,
        ]);

      }

      // Clear form
      setTitle("");
      setCategory("Personal");
      setPriority("Medium");
      setDueDate("");
      setAddToGoogleCalendar(false);

      // Close add-task card
      setShowAddTask(false);

      // Refresh calendar events after small delay if added
      if (user.googleConnected && addToGoogleCalendar) {
        setTimeout(fetchGoogleTasks, 1500);
      }

    } catch (error) {

      console.error(
        "Failed to add task:",
        error
      );

    }
  };


  // =====================================================
  // TOGGLE TASK
  // =====================================================

  const toggleTask = async (task) => {

    try {

      const token =
        localStorage.getItem(
          "taskflowToken"
        );

      const response = await fetch(
        `${API_BASE_URL}/api/tasks/${task._id}`,
        {
          method: "PATCH",

          headers: {
            "Content-Type":
              "application/json",

            ...(token
              ? {
                  Authorization:
                    `Bearer ${token}`,
                }
              : {}),
          },

          body: JSON.stringify({
            completed:
              !task.completed,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          "Failed to update task"
        );
      }

      const updatedTask =
        await response.json();

      setTasks((prev) =>
        prev.map((t) =>
          t._id === updatedTask._id
            ? updatedTask
            : t
        )
      );

    } catch (error) {

      console.error(
        "Failed to update task:",
        error
      );

    }
  };


  // =====================================================
  // DELETE TASK
  // =====================================================

  const deleteTask = async (id, isGoogleEvent) => {

    try {

      const token =
        localStorage.getItem(
          "taskflowToken"
        );

      const endpoint = isGoogleEvent
        ? `${API_BASE_URL}/api/calendar/events/${id}`
        : `${API_BASE_URL}/api/tasks/${id}`;

      const response = await fetch(
        endpoint,
        {
          method: "DELETE",

          headers: token
            ? {
                Authorization:
                  `Bearer ${token}`,
              }
            : {},
        }
      );

      if (!response.ok) {
        throw new Error(
          "Failed to delete task"
        );
      }

      if (isGoogleEvent) {
        setGoogleTasks((prev) =>
          prev.filter(
            (task) =>
              task._id !== id
          )
        );
      } else {
        setTasks((prev) =>
          prev.filter(
            (task) =>
              task._id !== id
          )
        );
      }

    } catch (error) {

      console.error(
        "Failed to delete task:",
        error
      );

    }
  };


  // =====================================================
  // FILTER + SEARCH
  // =====================================================

  const allTasks = showGoogleCalendar ? [...tasks, ...googleTasks] : tasks;

  const filteredTasks = allTasks

    .filter((task) => {

      if (filter === "completed") {
        return task.completed;
      }

      if (filter === "today") {

        const today =
          new Date()
            .toISOString()
            .slice(0, 10);

        const taskDate = task.due_date ? task.due_date.slice(0, 10) : "";

        return (
          !task.completed &&
          taskDate === today
        );
      }

      if (filter === "upcoming") {

        const today =
          new Date()
            .toISOString()
            .slice(0, 10);

        const taskDate = task.due_date ? task.due_date.slice(0, 10) : "";

        return (
          !task.completed &&
          taskDate &&
          taskDate > today
        );
      }

      if (filter === "important") {

        return (
          !task.completed &&
          task.priority === "High"
        );
      }

      return true;
    })

    .filter((task) => {

      const text =
        `${task.title} ${task.category} ${task.priority}`
          .toLowerCase();

      return text.includes(
        search.toLowerCase()
      );
    });

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }
    const dateA = a.due_date ? a.due_date.slice(0, 10) : "9999-12-31";
    const dateB = b.due_date ? b.due_date.slice(0, 10) : "9999-12-31";
    return dateA.localeCompare(dateB);
  });


  // =====================================================
  // STATISTICS
  // =====================================================

  const todoCount =
    tasks.filter(
      (task) => !task.completed
    ).length;

  const completedCount =
    tasks.filter(
      (task) => task.completed
    ).length;

  const progress =
    tasks.length
      ? Math.round(
          (completedCount /
            tasks.length) *
            100
        )
      : 0;


  // =====================================================
  // GREETING
  // =====================================================

  const hour =
    new Date().getHours();

  let greeting =
    "Good morning";

  if (hour >= 12 && hour < 18) {
    greeting =
      "Good afternoon";
  }

  if (hour >= 18) {
    greeting =
      "Good evening";
  }


  // =====================================================
  // LANDING / LOGIN PAGE
  // =====================================================

  if (!user) {

    return (

      <div className="welcome-page">

        <div className="welcome-card">

          {/* LOGO */}

          <div className="welcome-logo">
            T
          </div>


          {/* TITLE */}

          <h1 className="welcome-title">

            {authMode === "login"
              ? "Welcome back"
              : "Create your account"}

          </h1>


          <p className="welcome-subtitle">

            {authMode === "login"
              ? "Sign in to continue to your TaskFlow dashboard."
              : "Create your TaskFlow account and organize your day."}

          </p>


          {/* AUTH FORM */}

          <form
            className="welcome-form"
            onSubmit={handleAuth}
          >

            {/* NAME */}

            {authMode === "register" && (

              <>
                <label htmlFor="name">
                  Your name
                </label>

                <input
                  id="name"
                  type="text"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) =>
                    setName(
                      e.target.value
                    )
                  }
                  required
                />
              </>

            )}


            {/* EMAIL */}

            <label htmlFor="email">
              Email
            </label>

            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) =>
                setEmail(
                  e.target.value
                )
              }
              required
            />


            {/* PASSWORD */}

            <label htmlFor="password">
              Password
            </label>

            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) =>
                setPassword(
                  e.target.value
                )
              }
              minLength={6}
              required
            />


            {/* ERROR */}

            {authError && (

              <p className="auth-error">
                {authError}
              </p>

            )}


            {/* SUBMIT */}

            <button
              type="submit"
              disabled={authLoading}
            >

              {authLoading
                ? "Please wait..."
                : authMode === "login"
                ? "Sign in"
                : "Create account"}

              {!authLoading && (
                <span>→</span>
              )}

            </button>

          </form>


          {/* DIVIDER */}

          <div className="auth-divider">

            <span></span>

            <p>OR</p>

            <span></span>

          </div>


          {/* GOOGLE */}

          <button
            type="button"
            className="google-button"
            onClick={() => {

              window.location.href =
                `${API_BASE_URL}/api/auth/google`;

            }}
          >

            <span className="google-icon">
              G
            </span>

            Continue with Google

          </button>


          {/* LOGIN / SIGNUP SWITCH */}

          <p className="auth-switch">

            {authMode === "login"
              ? "Don't have an account?"
              : "Already have an account?"}

            <button
              type="button"
              onClick={() => {

                setAuthMode(
                  authMode === "login"
                    ? "register"
                    : "login"
                );

                setAuthError("");

              }}
            >

              {authMode === "login"
                ? "Sign up"
                : "Sign in"}

            </button>

          </p>


          <p className="welcome-note">
            Your account keeps your tasks private and synced.
          </p>

        </div>

      </div>

    );
  }


  // =====================================================
  // DASHBOARD
  // =====================================================

  return (

    <div className="app-shell">

      {/* =================================================
          SIDEBAR
      ================================================= */}

      <aside className="sidebar">

        <div className="brand">

          <div className="brand-mark">
            T
          </div>

          TaskFlow

        </div>


        <div className="nav-label">
          Menu
        </div>


        <nav
          className="side-nav"
          aria-label="Sidebar navigation"
        >

          {/* DASHBOARD */}

          <button
            className={`nav-item ${
              filter === "all"
                ? "active"
                : ""
            }`}
            type="button"
            onClick={() =>
              setFilter("all")
            }
          >

            Dashboard

            <span className="nav-count">
              {tasks.length}
            </span>

          </button>


          {/* TODAY */}

          <button
            className={`nav-item ${
              filter === "today"
                ? "active"
                : ""
            }`}
            type="button"
            onClick={() =>
              setFilter("today")
            }
          >

            Today

            <span className="nav-count">
              {tasks.filter(
                (task) =>
                  !task.completed &&
                  task.due_date ===
                    new Date()
                      .toISOString()
                      .slice(0, 10)
              ).length}
            </span>

          </button>


          {/* UPCOMING */}

          <button
            className={`nav-item ${
              filter === "upcoming"
                ? "active"
                : ""
            }`}
            type="button"
            onClick={() =>
              setFilter("upcoming")
            }
          >

            Upcoming

            <span className="nav-count">
              {tasks.filter(
                (task) =>
                  !task.completed &&
                  task.due_date &&
                  task.due_date >
                    new Date()
                      .toISOString()
                      .slice(0, 10)
              ).length}
            </span>

          </button>


          {/* COMPLETED */}

          <button
            className={`nav-item ${
              filter === "completed"
                ? "active"
                : ""
            }`}
            type="button"
            onClick={() =>
              setFilter("completed")
            }
          >

            Completed

            <span className="nav-count">
              {completedCount}
            </span>

          </button>


          {/* IMPORTANT */}

          <button
            className={`nav-item ${
              filter === "important"
                ? "active"
                : ""
            }`}
            type="button"
            onClick={() =>
              setFilter("important")
            }
          >

            Important

            <span className="nav-count">
              {tasks.filter(
                (task) =>
                  !task.completed &&
                  task.priority ===
                    "High"
              ).length}
            </span>

          </button>

        </nav>


        {/* NEW TASK */}

        <button
          className="new-task-side"
          type="button"
          onClick={() =>
            setShowAddTask(true)
          }
        >

          + New Task

        </button>


        {/* GOOGLE CALENDAR CONNECTION */}
        <div className="sidebar-integrations">
          <div className="nav-label">
            Integrations
          </div>
          {user.googleConnected ? (
            <div className="integration-card connected">
              <div className="integration-icon-label">
                <span className="g-cal-dot" />
                Google Calendar
              </div>
              <div className="integration-actions">
                <button
                  type="button"
                  className={`toggle-gcal-button ${showGoogleCalendar ? "active" : ""}`}
                  onClick={() => setShowGoogleCalendar(!showGoogleCalendar)}
                  title={showGoogleCalendar ? "Hide Google Calendar tasks" : "Show Google Calendar tasks"}
                >
                  {showGoogleCalendar ? "Visible" : "Hidden"}
                </button>
                <button
                  type="button"
                  className="disconnect-gcal-button"
                  onClick={handleDisconnectGoogle}
                >
                  Disconnect
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="google-connect-sidebar-button"
              onClick={handleConnectGoogle}
            >
              <span className="google-icon-sidebar">G</span>
              Connect Calendar
            </button>
          )}
        </div>


        {/* USER PROFILE */}

        <div className="profile-card">

          <div className="avatar">

            {user.name
              ?.slice(0, 2)
              .toUpperCase()}

          </div>


          <div className="profile-meta">

            <p className="profile-name">
              {user.name}
            </p>

            <p className="profile-role">
              {user.email}
            </p>

          </div>


          <button
            type="button"
            className="logout-button"
            onClick={logout}
            title="Sign out"
          >
            ↪
          </button>

        </div>

      </aside>


      {/* =================================================
          MAIN WORKSPACE
      ================================================= */}

      <main className="workspace">

        <header className="topbar">

          <div>

            <p className="eyebrow">
              {greeting}
            </p>

            <h1 className="dashboard-title">
              {user.name} 👋
            </h1>

            <p className="dashboard-subtitle">
              Review work, priorities, and upcoming deadlines.
            </p>

          </div>


          <div className="top-actions">

            {/* SEARCH */}

            <div className="search-box">

              🔍

              <input
                type="search"
                placeholder="Search tasks..."
                value={search}
                onChange={(e) =>
                  setSearch(
                    e.target.value
                  )
                }
              />

            </div>


            {/* NOTIFICATION */}

            <button
              type="button"
              className="icon-button"
              aria-label="Notifications"
            >
              🔔
            </button>

          </div>

        </header>


        {/* =================================================
            DASHBOARD GRID
        ================================================= */}

        <section className="dashboard-grid">

          <div className="main-column">


            {/* =================================================
                STATISTICS
            ================================================= */}

            <div className="stats-grid">

              <article className="stat-card accent">

                <p className="stat-label">
                  Open tasks
                </p>

                <div className="stat-number">
                  {todoCount}
                </div>

              </article>


              <article className="stat-card amber">

                <p className="stat-label">
                  Completed
                </p>

                <div className="stat-number">
                  {completedCount}
                </div>

              </article>


              <article className="stat-card rose">

                <p className="stat-label">
                  Due today
                </p>

                <div className="stat-number">

                  {tasks.filter(
                    (task) =>
                      !task.completed &&
                      task.due_date ===
                        new Date()
                          .toISOString()
                          .slice(0, 10)
                  ).length}

                </div>

              </article>


              <article className="stat-card">

                <p className="stat-label">
                  Focus score
                </p>

                <div className="stat-number">
                  {progress}%
                </div>

              </article>

            </div>


            {/* =================================================
                ADD TASK
            ================================================= */}

            {showAddTask && (

              <div className="add-card">

                <div className="add-task-header">

                  <div>

                    <h2 className="section-title">
                      Add a new task
                    </h2>

                    <p className="helper-text">
                      Capture the next action, choose a category, and set the timeline.
                    </p>

                  </div>


                  <button
                    type="button"
                    className="close-task-button"
                    onClick={() =>
                      setShowAddTask(false)
                    }
                  >
                    ×
                  </button>

                </div>


                <form
                  className="task-form"
                  onSubmit={addTask}
                >

                  {/* TITLE */}

                  <input
                    className="field-control"
                    type="text"
                    placeholder="Task title"
                    value={title}
                    onChange={(e) =>
                      setTitle(
                        e.target.value
                      )
                    }
                    autoFocus
                  />


                  {/* CATEGORY */}

                  <select
                    className="field-control"
                    value={category}
                    onChange={(e) =>
                      setCategory(
                        e.target.value
                      )
                    }
                  >

                    <option value="Work">
                      Work
                    </option>

                    <option value="Study">
                      Study
                    </option>

                    <option value="Personal">
                      Personal
                    </option>

                  </select>


                  {/* PRIORITY */}

                  <select
                    className="field-control"
                    value={priority}
                    onChange={(e) =>
                      setPriority(
                        e.target.value
                      )
                    }
                  >

                    <option value="Low">
                      Low
                    </option>

                    <option value="Medium">
                      Medium
                    </option>

                    <option value="High">
                      High
                    </option>

                  </select>


                  {/* DATE */}

                  <input
                    className="field-control"
                    type="text"
                    placeholder="Due date"
                    value={dueDate}
                    onChange={(e) =>
                      setDueDate(
                        e.target.value
                      )
                    }
                  />


                  {/* ADD TO GOOGLE CALENDAR */}
                  {user.googleConnected && (
                    <div className="add-gcal-checkbox-container">
                      <input
                        type="checkbox"
                        id="addToGoogleCalendar"
                        checked={addToGoogleCalendar}
                        onChange={(e) => setAddToGoogleCalendar(e.target.checked)}
                      />
                      <label htmlFor="addToGoogleCalendar">
                        Add to Google Calendar
                      </label>
                    </div>
                  )}

                  {/* ADD */}

                  <button
                    className="add-button"
                    type="submit"
                    disabled={!title.trim()}
                  >
                    + Add task
                  </button>

                </form>

              </div>

            )}


            {/* =================================================
                TASK LIST
            ================================================= */}

            <div className="tasks-card">

              <div className="tasks-toolbar">

                <div>

                  <h2 className="section-title">
                    Task list
                  </h2>

                  <span className="task-count">
                    {filteredTasks.length} tasks
                  </span>

                </div>


                {/* FILTER TABS */}

                <div
                  className="tabs"
                  aria-label="Task tabs"
                >

                  <button
                    type="button"
                    className={`filter-tab ${
                      filter === "all"
                        ? "active"
                        : ""
                    }`}
                    onClick={() =>
                      setFilter("all")
                    }
                  >
                    All
                  </button>


                  <button
                    type="button"
                    className={`filter-tab ${
                      filter === "today"
                        ? "active"
                        : ""
                    }`}
                    onClick={() =>
                      setFilter("today")
                    }
                  >
                    Today
                  </button>


                  <button
                    type="button"
                    className={`filter-tab ${
                      filter === "completed"
                        ? "active"
                        : ""
                    }`}
                    onClick={() =>
                      setFilter("completed")
                    }
                  >
                    Done
                  </button>

                </div>

              </div>


              {/* TASKS */}

              <div className="task-list">

                {sortedTasks.length > 0 ? (

                  sortedTasks.map(
                    (task) => (

                      <div
                        key={task._id}
                        className={`task-row ${
                          task.completed
                            ? "completed"
                            : ""
                        } ${task.isGoogleEvent ? "google-event-row" : ""}`}
                      >

                        {/* CHECKBOX / CALENDAR LINK */}

                        {task.isGoogleEvent ? (
                          <a
                            href={task.htmlLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="task-check google"
                            title="Open in Google Calendar"
                          >
                            📅
                          </a>
                        ) : (
                          <button
                            type="button"
                            className="task-check"
                            onClick={() =>
                              toggleTask(task)
                            }
                            aria-label={
                              task.completed
                                ? "Mark task incomplete"
                                : "Mark task complete"
                            }
                          >
                            {task.completed
                              ? "✓"
                              : ""}
                          </button>
                        )}


                        {/* TASK TITLE */}

                        <div className="task-copy">

                          <h3 className="task-title">
                            {task.title}
                          </h3>

                        </div>


                        {/* TASK INFORMATION */}

                        <div className="task-meta">

                          <span className={`tag ${task.isGoogleEvent ? "google-tag" : ""}`}>
                            {task.category}
                          </span>


                          {!task.isGoogleEvent && (
                            <span
                              className={`priority ${
                                task.priority?.toLowerCase()
                              }`}
                            >

                              <span className="priority-dot" />

                              {task.priority}

                            </span>
                          )}


                          <span className="due-date">
                            {task.due_date ? (
                              task.isGoogleEvent ? (
                                new Date(task.due_date).toLocaleString([], {
                                  dateStyle: "medium",
                                  timeStyle: "short",
                                })
                              ) : (
                                task.due_date
                              )
                            ) : (
                              "No date"
                            )}
                          </span>


                          {/* DELETE */}

                          <button
                            type="button"
                            className="delete-button"
                            aria-label={`Delete ${task.title}`}
                            onClick={() =>
                              deleteTask(
                                task._id,
                                task.isGoogleEvent
                              )
                            }
                          >
                            ×
                          </button>

                        </div>

                      </div>

                    )
                  )

                ) : (

                  <div className="empty-state">

                    <div className="empty-icon">
                      ✓
                    </div>

                    <h3 className="empty-title">
                      No tasks found
                    </h3>

                    <p className="empty-copy">
                      Try another search or add a new task.
                    </p>

                  </div>

                )}

              </div>

            </div>

          </div>


          {/* =================================================
              PROGRESS PANEL
          ================================================= */}

          <aside className="progress-panel">

            <p className="panel-kicker">
              Progress
            </p>

            <p className="progress-number">
              {progress}%
            </p>

            <p className="progress-caption">
              {completedCount} of{" "}
              {tasks.length} tasks completed.
            </p>


            <div
              className="progress-track"
              aria-label="Task progress"
            >

              <div
                className="progress-fill"
                style={{
                  width:
                    `${progress}%`,
                }}
              />

            </div>


            <div className="progress-note">

              {progress === 100
                ? "Everything is complete. Great work! ✨"
                : "Keep the momentum going — you're making progress."}

            </div>

          </aside>

        </section>

      </main>

    </div>
  );
}

export default App;