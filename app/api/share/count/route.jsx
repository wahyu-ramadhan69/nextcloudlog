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
    let totalSharedFiles = 0;

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

          if (isIncluded) totalSharedFiles++;
        }
      } catch {
        // skip
      }
    }

    return Response.json(
      {
        totalSharedFiles,
        filter: filterType,
      },
      { status: 200 }
    );
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
