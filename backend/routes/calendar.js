const express = require("express");
const { google } = require("googleapis");
const authMiddleware = require("../middleware/auth");
const User = require("../models/User");
const { getOAuth2Client } = require("../utils/googleCalendar");

const router = express.Router();

// GET /api/calendar/events - Fetch Google Calendar events starting from today
router.get("/events", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || !user.googleAccessToken) {
      return res.status(200).json([]); // Return empty list to handle disconnected state gracefully
    }

    const oauth2Client = getOAuth2Client(user);
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: new Date().toISOString(),
      maxResults: 50,
      singleEvents: true,
      orderBy: "startTime",
    });

    const events = response.data.items.map((event) => ({
      _id: event.id,
      title: event.summary || "No Title",
      description: event.description || "",
      category: "Google Calendar",
      priority: "Medium",
      due_date: event.start.dateTime || event.start.date || "",
      completed: false,
      isGoogleEvent: true,
      htmlLink: event.htmlLink,
    }));

    res.json(events);
  } catch (error) {
    console.error("Google Calendar Fetch Error:", error);
    res.status(500).json({ message: "Failed to fetch Google Calendar events" });
  }
});

// DELETE /api/calendar/events/:id - Delete a Google Calendar event
router.delete("/events/:id", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || !user.googleAccessToken) {
      return res.status(400).json({ message: "Google account not connected" });
    }

    const oauth2Client = getOAuth2Client(user);
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    await calendar.events.delete({
      calendarId: "primary",
      eventId: req.params.id,
    });

    res.json({ message: "Calendar event deleted successfully" });
  } catch (error) {
    console.error("Google Calendar Delete Error:", error);
    res.status(500).json({ message: "Failed to delete calendar event" });
  }
});

module.exports = router;
