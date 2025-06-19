import fs from "fs";
import readLastLines from "read-last-lines";

export async function GET(req) {
  try {
    const logPath = process.env.LOG_PATH;
    if (!logPath || !fs.existsSync(logPath)) {
      return new Response("Log file not found", { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const filter = searchParams.get("filter") || "all";
    const now = new Date();

    // Ambil 5000 baris terakhir (jaga-jaga sebagian tidak valid)
    console.log("masuk kesini");

    const lines = (await readLastLines.read(logPath, 5000))
      .split("\n")
      .reverse()
      .filter((line) => line.trim() !== "");

    const folderLogs = [];

    for (const line of lines) {
      if (folderLogs.length >= 1000) break;

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

        const match = entry.message.match(/File with id "(.*?)" written to:/);
        const folderId = match?.[1] || "Unknown";

        const urlMatch = entry.url.match(
          /\/remote\.php\/dav\/files\/[^/]+\/(.*)/
        );
        const folderPath = urlMatch
          ? decodeURIComponent(urlMatch[1])
          : "Unknown";

        folderLogs.push({
          ID: folderLogs.length + 1,
          User: entry.user,
          FolderID: folderId,
          Message: `Folder "${folderPath}" (ID: ${folderId}) dibuat oleh "${entry.user}"`,
          url: entry.url,
          Path: folderPath,
          Waktu: entry.time,
        });
      } catch {
        continue;
      }
    }

    return new Response(JSON.stringify(folderLogs), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error reading tail logs:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
}
