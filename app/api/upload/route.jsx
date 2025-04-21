import fs from "fs";

export async function GET(req) {
  try {
    const logPath = process.env.LOG_PATH;

    if (!logPath || !fs.existsSync(logPath)) {
      return Response.json({ error: "Log file not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const filterType = searchParams.get("filter") || "daily"; // daily, weekly, monthly, all

    const logs = fs.readFileSync(logPath, "utf8").split("\n").filter(Boolean);
    let logEntries = logs
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch (error) {
          return null;
        }
      })
      .filter(
        (entry) =>
          entry &&
          entry.message &&
          entry.message.includes("File with id") &&
          entry.message.includes("created")
      )
      .map((entry) => ({
        user: entry.user,
        method: entry.method,
        url: entry.url,
        message: entry.message,
        userAgent: entry.userAgent,
        time: entry.time,
      }));

    // Filter berdasarkan waktu
    const now = new Date();
    logEntries = logEntries.filter((log) => {
      const logDate = new Date(log.time);
      if (filterType === "daily") {
        return logDate.toDateString() === now.toDateString();
      } else if (filterType === "weekly") {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(now.getDate() - 7);
        return logDate >= oneWeekAgo;
      } else if (filterType === "monthly") {
        return (
          logDate.getMonth() === now.getMonth() &&
          logDate.getFullYear() === now.getFullYear()
        );
      }
      return true; // default: tampilkan semua log
    });

    // Urutkan dari terbaru ke terlama
    logEntries.sort((a, b) => new Date(b.time) - new Date(a.time));

    return Response.json(logEntries, { status: 200 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
