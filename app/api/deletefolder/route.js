import fs from "fs";
import readline from "readline";

export async function GET(req) {
  try {
    const logPath = process.env.LOG_PATH;

    if (!logPath || !fs.existsSync(logPath)) {
      return new Response(JSON.stringify({ error: "Log file not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { searchParams } = new URL(req.url);
    const filterType = searchParams.get("filter") || "all";
    const now = new Date();

    const fileStream = fs.createReadStream(logPath, { encoding: "utf8" });
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    const folderLogs = [];

    for await (const line of rl) {
      if (folderLogs.length >= 100) break;

      try {
        const entry = JSON.parse(line);

        if (entry?.message?.includes("deleted:")) {
          const match = entry.message.match(
            /File with id "(.*?)" deleted: "(.*?)"/
          );
          const fileId = match?.[1] || "Unknown";
          const fileName = match?.[2]?.trim();

          const isFolder = !fileName; // nama kosong berarti folder

          if (isFolder) {
            const logDate = new Date(entry.time);

            let isIncluded = false;
            if (filterType === "daily") {
              isIncluded = logDate.toDateString() === now.toDateString();
            } else if (filterType === "weekly") {
              const oneWeekAgo = new Date(now);
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
              folderLogs.push({
                user: entry.user,
                folderPath: entry.url,
                method: entry.method,
                message: `Folder dengan ID "${fileId}" telah dihapus oleh "${entry.user}"`,
                userAgent: entry.userAgent,
                time: entry.time,
              });
            }
          }
        }
      } catch {
        // Skip invalid JSON line
      }
    }

    // Urutkan dari terbaru ke terlama
    folderLogs.sort((a, b) => new Date(b.time) - new Date(a.time));

    return new Response(JSON.stringify(folderLogs.slice(0, 100)), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error during folder log processing:", err);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
