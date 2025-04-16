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

    const unshareLogs = logs
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(
        (entry) =>
          entry &&
          entry.message?.includes("has been unshared from the user") &&
          entry.method === "DELETE"
      )
      .map((entry) => {
        const match = entry.message.match(
          /The folder "(.*?)" with ID ".*?" has been unshared from the user "(.*?)"/
        );

        const folderName = match ? match[1] : "Unknown";
        const targetUser = match ? match[2] : "Unknown";

        return {
          user: entry.user,
          targetUser,
          method: entry.method,
          url: entry.url,
          message: `Folder "${folderName}" telah di-unshare oleh "${entry.user}" dari pengguna "${targetUser}"`,
          userAgent: entry.userAgent,
          time: entry.time,
        };
      });

    // Filter waktu
    const now = new Date();
    const filteredLogs = unshareLogs.filter((log) => {
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

    filteredLogs.sort((a, b) => new Date(b.time) - new Date(a.time));

    return Response.json(filteredLogs, { status: 200 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
