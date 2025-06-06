import fs from "fs";
import readline from "readline";
import ExcelJS from "exceljs";

export async function GET(req) {
  try {
    const logPath = process.env.LOG_PATH;

    if (!logPath || !fs.existsSync(logPath)) {
      return new Response("Log file not found", { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const filterType = searchParams.get("filter") || "all";
    const now = new Date();

    const fileStream = fs.createReadStream(logPath, { encoding: "utf8" });
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    const logEntries = [];

    for await (const line of rl) {
      try {
        const entry = JSON.parse(line);

        if (entry && entry.message && entry.message.includes("deleted:")) {
          const match = entry.message.match(
            /File with id "(.*?)" deleted: "(.*?)"/
          );
          const fileId = match?.[1] || "Unknown";
          const fileName = match?.[2]?.trim() || "Unknown";
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
            logEntries.push({
              User: entry.user,
              FileName: fileName,
              Method: entry.method,
              URL: entry.url,
              Message: `File "${fileName}" (ID: ${fileId}) telah dihapus oleh "${entry.user}"`,
              UserAgent: entry.userAgent,
              Time: entry.time,
            });
          }
        }
      } catch {
        // Skip invalid JSON
      }
    }

    // Sort the entries by Time (descending)
    logEntries.sort((a, b) => new Date(b.Time) - new Date(a.Time));

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Deleted Files");

    // Set header columns
    if (logEntries.length > 0) {
      worksheet.columns = Object.keys(logEntries[0]).map((key) => ({
        header: key,
        key,
        width: 30,
      }));
    }

    // Add rows
    logEntries.forEach((entry) => {
      worksheet.addRow(entry);
    });

    const buffer = await workbook.xlsx.writeBuffer();

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="deleted-files-${filterType}-logs.xlsx"`,
      },
    });
  } catch (err) {
    console.error("Error while processing logs:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
}
