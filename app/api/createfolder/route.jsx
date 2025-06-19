import fs from "fs/promises";

export async function GET(req) {
  try {
    const logPath = process.env.LOG_PATH;
    if (!logPath) {
      return new Response(JSON.stringify({ error: "Log path not defined" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const fileHandle = await fs.open(logPath, "r");
    const stats = await fileHandle.stat();
    const CHUNK_SIZE = 4096; // 4KB chunk
    let position = stats.size;
    let buffer = Buffer.alloc(0);
    let lines = [];

    while (position > 0 && lines.length < 200) {
      const readSize = Math.min(CHUNK_SIZE, position);
      position -= readSize;
      const chunk = Buffer.alloc(readSize);
      await fileHandle.read(chunk, 0, readSize, position);
      buffer = Buffer.concat([chunk, buffer]);

      const parts = buffer.toString("utf8").split("\n");
      lines = parts.slice(-201); // jaga-jaga biar tidak potong
      buffer = Buffer.from(parts.slice(0, -201).join("\n"));
    }

    await fileHandle.close();

    const { searchParams } = new URL(req.url);
    const filter = searchParams.get("filter") || "all";
    const now = new Date();

    const folderLogs = [];

    for (const line of lines.reverse()) {
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
        // skip invalid JSON
      }
    }

    return new Response(JSON.stringify(folderLogs), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
