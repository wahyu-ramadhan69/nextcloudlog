import fs from "fs";

export async function GET(req) {
  try {
    const logPath = process.env.LOG_PATH;

    if (!logPath || !fs.existsSync(logPath)) {
      return Response.json({ error: "Log file not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const filterType = searchParams.get("filter") || "daily"; // daily, weekly, monthly, all
    const logType = searchParams.get("type") || "created"; // created, unshare

    const logs = fs.readFileSync(logPath, "utf8").split("\n").filter(Boolean);

    let logEntries = logs
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter((entry) => {
        if (!entry || !entry.message || !entry.method) return false;

        if (logType === "created") {
          return (
            entry.message.includes("File with id") &&
            entry.message.includes("created") &&
            entry.method === "MKCOL"
          );
        } else if (logType === "unshare") {
          return (
            entry.message.includes("has been unshared from the user") &&
            entry.method === "DELETE"
          );
        }
        return false;
      })
      .map((entry) => {
        let detailMessage = "";
        let folderName = "Unknown";
        let targetUser = "Unknown";

        if (logType === "created") {
          const match = entry.message.match(
            /File with id "(.*?)" created: "(.*?)"/
          );
          folderName = match ? match[2] : "Unknown";
          detailMessage = `Folder dengan nama "${folderName}" telah dibuat oleh "${entry.user}"`;
        } else if (logType === "unshare") {
          const match = entry.message.match(
            /The folder "(.*?)" with ID ".*?" has been unshared from the user "(.*?)"/
          );
          folderName = match ? match[1] : "Unknown";
          targetUser = match ? match[2] : "Unknown";
          detailMessage = `Folder "${folderName}" telah di-unshare oleh "${entry.user}" dari pengguna "${targetUser}"`;
        }

        return {
          user: entry.user,
          method: entry.method,
          url: entry.url,
          message: detailMessage,
          userAgent: entry.userAgent,
          time: entry.time,
        };
      });

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
      return true;
    });

    // Urutkan dari terbaru ke terlama
    logEntries.sort((a, b) => new Date(b.time) - new Date(a.time));

    return Response.json(logEntries, { status: 200 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
