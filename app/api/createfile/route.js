import fs from "fs";
import readline from "readline";

export async function GET(req) {
  try {
    const logPath = process.env.LOG_PATH;

    if (!logPath || !fs.existsSync(logPath)) {
      return Response.json({ error: "Log file not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const filterType = searchParams.get("filter") || "daily";

    const now = new Date();
    const logEntries = [];

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
          entry.message.includes("File with id") &&
          entry.message.includes("created")
        ) {
          const match = entry.message.match(
            /File with id "(.*?)" created: "(.*?)"/
          );
          const folderName = match ? match[2] : "Unknown";

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
            logEntries.push({
              user: entry.user,
              method: entry.method,
              url: entry.url,
              message: `File dengan nama "${folderName}" telah dibuat/diupload oleh "${entry.user}"`,
              userAgent: entry.userAgent,
              time: entry.time,
            });
          }
        }
      } catch {
        // skip line if JSON.parse fails
      }
    }

    // Sort descending by time (terbaru dulu)
    logEntries.sort((a, b) => new Date(b.time) - new Date(a.time));

    // Ambil maksimal 50 entri
    const limitedEntries = logEntries.slice(0, 50);

    return Response.json(limitedEntries, { status: 200 });
  } catch (error) {
    console.error("Error reading log:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
