import fs from "fs";

export async function GET(req) {
  try {
    const logPath = process.env.LOG_PATH;

    if (!logPath || !fs.existsSync(logPath)) {
      return Response.json({ error: "Log file not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const filterType = searchParams.get("filter") || "daily";

    const logs = fs.readFileSync(logPath, "utf8").split("\n").filter(Boolean);
    let count = 0;
    const now = new Date();

    logs.forEach((line) => {
      try {
        const entry = JSON.parse(line);

        if (
          entry &&
          entry.message &&
          entry.message.includes("Login successful") &&
          entry.url === "/index.php/login"
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

          if (isIncluded) count++;
        }
      } catch {
        // skip jika tidak bisa di-parse
      }
    });

    return Response.json({ totalLoginSuccess: count }, { status: 200 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
