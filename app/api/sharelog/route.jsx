import fs from "fs";
import readline from "readline";

export async function GET(req) {
  try {
    const logPath = process.env.LOG_PATH;

    if (!logPath || !fs.existsSync(logPath)) {
      return Response.json({ error: "Log file not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const filterType = searchParams.get("filter") || "all";

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

    const now = new Date();
    const filteredLogs = [];

    const fileStream = fs.createReadStream(logPath, { encoding: "utf8" });
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    for await (const line of rl) {
      try {
        const entry = JSON.parse(line);

        if (
          entry &&
          entry.message &&
          entry.message.includes("has been shared to the user")
        ) {
          const match = entry.message.match(
            /The folder "(.*?)" .*? has been shared to the user "(.*?)" with permissions "(.*?)"/
          );

          const folderName = match?.[1] || "Unknown";
          const sharedTo = match?.[2] || "Unknown";
          const permissionCode = parseInt(match?.[3] || "0", 10);
          const permissionText =
            permissionMap[permissionCode] || `Permission ${permissionCode}`;

          const logDate = new Date(entry.time);
          let isIncluded = false;

          if (filterType === "daily") {
            isIncluded = logDate.toDateString() === now.toDateString();
          } else if (filterType === "weekly") {
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(now.getDate() - 7);
            isIncluded = logDate >= oneWeekAgo;
          } else if (filterType === "monthly") {
            isIncluded =
              logDate.getMonth() === now.getMonth() &&
              logDate.getFullYear() === now.getFullYear();
          } else {
            isIncluded = true;
          }

          if (isIncluded) {
            filteredLogs.push({
              user: entry.user,
              sharedTo: sharedTo,
              method: entry.method,
              url: entry.url,
              message: `Folder dengan nama "${folderName}" telah di-share oleh "${entry.user}" kepada "${sharedTo}" dengan izin ${permissionText}`,
              userAgent: entry.userAgent,
              time: entry.time,
            });
          }
        }
      } catch {
        // skip jika tidak bisa parse
      }
    }

    // Urutkan log dari terbaru ke terlama
    filteredLogs.sort((a, b) => new Date(b.time) - new Date(a.time));

    // Ambil hanya 50 entri terbaru
    const limitedLogs = filteredLogs.slice(0, 50);

    return Response.json(limitedLogs, { status: 200 });
  } catch (error) {
    console.error("Error processing shared folder logs:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
