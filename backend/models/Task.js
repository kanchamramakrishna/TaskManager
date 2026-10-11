const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    maxlength: 100
  },

  description: {
    type: String,
    default: ""
  },

  category: {
    type: String,
    enum: ["Work", "Study", "Personal"],
    default: "Personal"
  },

  priority: {
    type: String,
    enum: ["Low", "Medium", "High"],
    default: "Medium"
  },

  due_date: {
    type: String,
    default: ""
  },

  completed: {
    type: Boolean,
    default: false
  },

  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  googleEventId: {
    type: String,
    default: null
  },

  created_at: {
    type: Date,
    default: Date.now
  }
});

const Task = mongoose.model("Task", taskSchema);

module.exports = Task;