import fs from "fs";

export async function GET(req) {
  try {
    const logPath = process.env.LOG_PATH;

    if (!logPath || !fs.existsSync(logPath)) {
      return Response.json({ error: "Log file not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const filterType = searchParams.get("filter") || "all"; // daily, weekly, monthly, all

    const permissionMap = {
      1: "Read",
      3: "Read, Edit",
      5: "Read, Create",
      7: "Read, Create, Edit",
      9: "Read, Delete",
      11: "Read, Edit, Delete",
      13: "Read, Create, Delete",
      15: "Read, Create, Edit, Delete",
      17: "Read, Share",
      19: "Read, Edit, Share",
      21: "Read, Create, Share",
      23: "Read, Create, Edit, Share",
      25: "Read, Share, Delete",
      27: "Read, Edit, Share, Delete",
      29: "Read, Create, Share, Delete",
      31: "Read, Create, Edit, Share, Delete",
    };

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
        (entry) =>
          entry &&
          entry.message &&
          entry.message.includes("has been shared to the user")
      )
      .map((entry) => {
        const match = entry.message.match(
          /The folder "(.*?)" .*? has been shared to the user "(.*?)" with permissions "(.*?)"/
        );
        const folderName = match ? match[1] : "Unknown";
        const sharedTo = match ? match[2] : "Unknown";
        const permission = match ? match[3] : "Unknown";

        const permissionText =
          permissionMap[permission] || `Permission ${permission}`;

        return {
          user: entry.user,
          method: entry.method,
          url: entry.url,
          message: `Folder dengan nama "${folderName}" telah di-share oleh "${entry.user}" kepada "${sharedTo}" dengan izin ${permissionText}`,
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
