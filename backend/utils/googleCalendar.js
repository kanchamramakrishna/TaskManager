const { google } = require("googleapis");

const getOAuth2Client = (user) => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_CALLBACK_URL || "http://localhost:5000/api/auth/google/callback"
  );

  oauth2Client.setCredentials({
    access_token: user.googleAccessToken,
    refresh_token: user.googleRefreshToken,
  });

  oauth2Client.on("tokens", async (tokens) => {
    if (tokens.access_token) {
      user.googleAccessToken = tokens.access_token;
      await user.save();
    }
  });

  return oauth2Client;
};

const createCalendarEvent = async (user, task) => {
  try {
    if (!user || !user.googleAccessToken) {
      throw new Error("User Google account not connected");
    }

    const oauth2Client = getOAuth2Client(user);
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    let startDateTime = new Date();
    if (task.due_date) {
      const parsedDate = new Date(task.due_date);
      if (!isNaN(parsedDate)) {
        startDateTime = parsedDate;
      }
    }

    const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000);

    const event = {
      summary: task.title,
      description: task.description || "Created via TaskFlow",
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: "UTC",
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: "UTC",
      },
    };

    const response = await calendar.events.insert({
      calendarId: "primary",
      resource: event,
    });

    return response.data;
  } catch (error) {
    console.error("Failed to create Google Calendar event:", error);
    throw error;
  }
};

const deleteCalendarEvent = async (user, eventId) => {
  try {
    if (!user || !user.googleAccessToken || !eventId) {
      return;
    }

    const oauth2Client = getOAuth2Client(user);
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    await calendar.events.delete({
      calendarId: "primary",
      eventId: eventId,
    });
  } catch (error) {
    console.error("Failed to delete Google Calendar event:", error);
  }
};

const updateCalendarEvent = async (user, eventId, task) => {
  try {
    if (!user || !user.googleAccessToken || !eventId) {
      return;
    }

    const oauth2Client = getOAuth2Client(user);
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    const summary = task.completed ? `✓ ${task.title}` : task.title.replace(/^✓ /, "");

    await calendar.events.patch({
      calendarId: "primary",
      eventId: eventId,
      resource: {
        summary: summary,
      },
    });
  } catch (error) {
    console.error("Failed to update Google Calendar event:", error);
  }
};

module.exports = {
  getOAuth2Client,
  createCalendarEvent,
  deleteCalendarEvent,
  updateCalendarEvent,
};
