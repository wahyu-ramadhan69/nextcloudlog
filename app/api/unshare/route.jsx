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
          entry.message?.includes("has been unshared from the user") &&
          entry.method === "DELETE"
        ) {
          const match = entry.message.match(
            /The folder "(.*?)" with ID ".*?" has been unshared from the user "(.*?)"/
          );

          const folderName = match?.[1] || "Unknown";
          const targetUser = match?.[2] || "Unknown";

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
              targetUser,
              method: entry.method,
              url: entry.url,
              message: `Folder "${folderName}" telah di-unshare oleh "${entry.user}" dari pengguna "${targetUser}"`,
              userAgent: entry.userAgent,
              time: entry.time,
            });
          }
        }
      } catch {
        // skip line if JSON.parse fails
      }
    }

    // Urutkan dari yang terbaru
    filteredLogs.sort((a, b) => new Date(b.time) - new Date(a.time));

    // Batasi maksimal 50 entri
    const limitedLogs = filteredLogs.slice(0, 50);

    return Response.json(limitedLogs, { status: 200 });
  } catch (error) {
    console.error("Error parsing unshare logs:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
