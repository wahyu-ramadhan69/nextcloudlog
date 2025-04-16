import fs from "fs";

export async function GET(req) {
  try {
    const logPath = process.env.LOG_PATH;

    if (!logPath || !fs.existsSync(logPath)) {
      return Response.json({ error: "Log file not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const filterType = searchParams.get("filter") || "all"; // daily, weekly, monthly, all

    const logs = fs.readFileSync(logPath, "utf8").split("\n").filter(Boolean);
    let logEntries = logs
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(
        (entry) => entry && entry.message && entry.message.includes("deleted:")
      )
      .map((entry) => {
        const match = entry.message.match(
          /File with id "(.*?)" deleted: "(.*?)"/
        );
        const fileId = match ? match[1] : "Unknown";
        const fileName = match ? match[2].trim() : "Unknown";

        return {
          time: entry.time,
          user: entry.user,
          method: entry.method,
          url: entry.url,
          message: `File dengan nama "${fileName}" (ID: ${fileId}) telah dihapus oleh "${entry.user}"`,
          userAgent: entry.userAgent,
        };
      });

    // Filter waktu
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
      return true;
    });

    // Urutkan terbaru ke terlama
    logEntries.sort((a, b) => new Date(b.time) - new Date(a.time));

    return Response.json(logEntries, { status: 200 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
