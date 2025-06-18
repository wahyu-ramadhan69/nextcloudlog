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
    const filter = searchParams.get("filter") || "all";
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

        const isFolderCreation =
          entry?.method === "MKCOL" &&
          entry?.message?.includes("written to:") &&
          entry?.url?.includes("/remote.php/dav/files/");

        if (!isFolderCreation) continue;

        const logDate = new Date(entry.time);
        let isIncluded = false;

        if (filter === "daily") {
          isIncluded = logDate.toDateString() === now.toDateString();
        } else if (filter === "weekly") {
          const oneWeekAgo = new Date(now);
          oneWeekAgo.setDate(now.getDate() - 7);
          isIncluded = logDate >= oneWeekAgo;
        } else if (filter === "monthly") {
          isIncluded =
            logDate.getMonth() === now.getMonth() &&
            logDate.getFullYear() === now.getFullYear();
        } else {
          isIncluded = true;
        }

        if (!isIncluded) continue;

        const match = entry.message.match(
          /File with id "(.*?)" written to: "(.*?)"/
        );
        const folderId = match?.[1] || "Unknown";
        const folderPath = match?.[2] || "Unknown";

        folderLogs.push({
          User: entry.user,
          FolderID: folderId,
          FolderPath: folderPath,
          URL: entry.url,
          Message: `Folder "${folderPath}" (ID: ${folderId}) dibuat oleh "${entry.user}"`,
          UserAgent: entry.userAgent,
          Time: entry.time,
        });
      } catch {
        // skip broken line
      }
    }

    folderLogs.sort((a, b) => new Date(b.Time) - new Date(a.Time));

    return new Response(JSON.stringify(folderLogs.slice(0, 1000)), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error reading folder logs:", err);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
