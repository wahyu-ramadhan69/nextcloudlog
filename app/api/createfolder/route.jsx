import fs from "fs/promises";

export async function GET(req) {
  try {
    const logPath = process.env.LOG_PATH;
    if (!logPath) {
      return new Response(JSON.stringify({ error: "LOG_PATH not defined" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const fileHandle = await fs.open(logPath, "r");
    const stats = await fileHandle.stat();
    const CHUNK_SIZE = 8192; // 8KB
    let position = stats.size;
    let leftover = "";
    const lines = [];

    // Baca mundur hingga cukup banyak baris
    while (position > 0 && lines.length < 500) {
      const readSize = Math.min(CHUNK_SIZE, position);
      position -= readSize;

      const buffer = Buffer.alloc(readSize);
      await fileHandle.read(buffer, 0, readSize, position);

      const chunkText = buffer.toString("utf8") + leftover;
      const split = chunkText.split("\n");
      leftover = split.shift() ?? "";

      lines.unshift(...split);
    }

    await fileHandle.close();

    const { searchParams } = new URL(req.url);
    const filter = searchParams.get("filter") || "all";
    const now = new Date();

    const folderLogs = [];

    for (const line of lines.reverse()) {
      if (folderLogs.length >= 10000) break;
      if (!line.trim()) continue;

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
          Path: folderPath,
          Waktu: entry.time,
        });
      } catch {
        // Lewati baris invalid
      }
    }

    return new Response(JSON.stringify(folderLogs), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("❌ Error:", err);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
