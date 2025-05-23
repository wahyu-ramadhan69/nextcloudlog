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

    const onlyOfficeLogs = [];

    for await (const line of rl) {
      if (onlyOfficeLogs.length >= 100) break;

      try {
        const entry = JSON.parse(line);

        if (
          entry?.message?.includes("accessed:") &&
          entry?.url?.includes("/onlyoffice/")
        ) {
          const match = entry.message.match(
            /File with id "(.*?)" accessed: "(.*?)"/
          );
          const fileId = match?.[1] || "Unknown";
          const fileName = match?.[2]?.trim() || "Unknown";
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
            onlyOfficeLogs.push({
              user: entry.user,
              fileName: fileName,
              fileId: fileId,
              url: entry.url,
              message: `File "${fileName}" (ID: ${fileId}) diakses via OnlyOffice oleh "${entry.user}"`,
              userAgent: entry.userAgent,
              time: entry.time,
            });
          }
        }
      } catch {
        // Skip invalid line
      }
    }

    // Urutkan dari terbaru ke terlama
    onlyOfficeLogs.sort((a, b) => new Date(b.time) - new Date(a.time));

    return new Response(JSON.stringify(onlyOfficeLogs.slice(0, 100)), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error processing OnlyOffice logs:", err);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
