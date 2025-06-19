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
    const filterTime = searchParams.get("filter") || "all";
    const now = new Date();

    const fileStream = fs.createReadStream(logPath, { encoding: "utf8" });
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    const uploadLogs = [];

    for await (const line of rl) {
      try {
        const entry = JSON.parse(line);

        const isUpload =
          entry?.method === "PUT" &&
          entry?.message?.includes("created:") &&
          entry?.url?.includes("/remote.php/dav/files/");

        if (!isUpload) continue;

        const logDate = new Date(entry.time);
        let isIncluded = false;

        if (filterTime === "daily") {
          isIncluded = logDate.toDateString() === now.toDateString();
        } else if (filterTime === "weekly") {
          const oneWeekAgo = new Date(now);
          oneWeekAgo.setDate(now.getDate() - 7);
          isIncluded = logDate >= oneWeekAgo;
        } else if (filterTime === "monthly") {
          isIncluded =
            logDate.getMonth() === now.getMonth() &&
            logDate.getFullYear() === now.getFullYear();
        } else {
          isIncluded = true;
        }

        if (!isIncluded) continue;

        const match = entry.message.match(
          /File with id "(.*?)" created: "(.*?)"/
        );
        const fileId = match?.[1] || "Unknown";
        const fileName = match?.[2]?.trim() || "Unknown";

        uploadLogs.push({
          user: entry.user,
          fileId,
          fileName,
          url: entry.url,
          message: `File "${fileName}" (ID: ${fileId}) di-*upload* oleh "${entry.user}"`,
          userAgent: entry.userAgent,
          time: entry.time,
        });
      } catch {
        continue; // skip invalid JSON
      }
    }

    // Sortir berdasarkan waktu terbaru
    uploadLogs.sort((a, b) => new Date(b.time) - new Date(a.time));

    // Ambil hanya 100 data terbaru
    const latest100 = uploadLogs.slice(0, 100);

    return new Response(JSON.stringify(latest100), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error processing upload logs:", err);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
