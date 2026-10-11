const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const Task = require("./models/Task");
const User = require("./models/User");
const authRoutes = require("./routes/auth");
const calendarRoutes = require("./routes/calendar");
const authMiddleware = require("./middleware/auth");
const { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } = require("./utils/googleCalendar");

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/calendar", calendarRoutes);


// ==========================
// GET ALL TASKS
// ==========================

app.get("/api/tasks", authMiddleware, async (req, res) => {
  try {
    const tasks = await Task.find({ user: req.userId }).sort({ created_at: -1 });

    res.json(tasks);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to fetch tasks"
    });
  }
});


// ==========================
// CREATE TASK
// ==========================

app.post("/api/tasks", authMiddleware, async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      priority,
      due_date,
      addToGoogleCalendar
    } = req.body;

    const user = await User.findById(req.userId);
    let googleEventId = null;

    if (addToGoogleCalendar && user && user.googleAccessToken) {
      try {
        const tempTask = { title, description, due_date };
        const gEvent = await createCalendarEvent(user, tempTask);
        if (gEvent && gEvent.id) {
          googleEventId = gEvent.id;
        }
      } catch (gErr) {
        console.error("Could not add event to Google Calendar:", gErr);
      }
    }

    const task = new Task({
      title,
      description,
      category,
      priority,
      due_date,
      user: req.userId,
      googleEventId
    });

    const savedTask = await task.save();

    res.status(201).json(savedTask);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to create task"
    });
  }
});


// ==========================
// UPDATE TASK
// ==========================

app.patch("/api/tasks/:id", authMiddleware, async (req, res) => {
  try {
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      { completed: req.body.completed },
      { new: true }
    );

    if (!task) {
      return res.status(404).json({
        message: "Task not found"
      });
    }

    if (task.googleEventId) {
      const user = await User.findById(req.userId);
      if (user && user.googleAccessToken) {
        await updateCalendarEvent(user, task.googleEventId, task);
      }
    }

    res.json(task);

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to update task"
    });
  }
});


// ==========================
// DELETE TASK
// ==========================

app.delete("/api/tasks/:id", authMiddleware, async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, user: req.userId });

    if (!task) {
      return res.status(404).json({
        message: "Task not found"
      });
    }

    if (task.googleEventId) {
      const user = await User.findById(req.userId);
      if (user && user.googleAccessToken) {
        await deleteCalendarEvent(user, task.googleEventId);
      }
    }

    res.json({
      message: "Task deleted successfully"
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to delete task"
    });
  }
});


// ==========================
// CONNECT TO MONGODB
// ==========================

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("MongoDB connected");

    app.listen(5000, () => {
      console.log("Server running on http://localhost:5000");
    });
  })
  .catch((error) => {
    console.error("MongoDB connection failed:", error);
  });