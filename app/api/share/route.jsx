import fs from "fs";

export async function GET(req) {
  try {
    const logPath = process.env.LOG_PATH;

    if (!logPath || !fs.existsSync(logPath)) {
      return Response.json({ error: "Log file not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const filterType = searchParams.get("filter") || "all"; // daily, weekly, monthly, all

    // Peta permission code ke teks
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

    const logEntries = logs
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

        const folderName = match?.[1] || "Unknown";
        const sharedTo = match?.[2] || "Unknown";
        const permissionCode = parseInt(match?.[3] || "0", 10);
        const permissionText =
          permissionMap[permissionCode] || `Permission ${permissionCode}`;

        return {
          user: entry.user,
          sharedTo: sharedTo,
          method: entry.method,
          url: entry.url,
          message: `Folder dengan nama "${folderName}" telah di-share oleh "${entry.user}" kepada "${sharedTo}" dengan izin ${permissionText}`,
          userAgent: entry.userAgent,
          time: entry.time,
        };
      });

    // Filter berdasarkan waktu
    const now = new Date();
    const filteredLogs = logEntries.filter((log) => {
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

    // Urutkan berdasarkan waktu terbaru
    filteredLogs.sort((a, b) => new Date(b.time) - new Date(a.time));

    return Response.json(filteredLogs, { status: 200 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
