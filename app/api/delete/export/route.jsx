import fs from "fs";
import ExcelJS from "exceljs";

export async function GET(req) {
  try {
    const logPath = process.env.LOG_PATH;

    if (!logPath || !fs.existsSync(logPath)) {
      return new Response("Log file not found", { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const filterType = searchParams.get("filter") || "all";

    const logs = fs.readFileSync(logPath, "utf8").split("\n").filter(Boolean);

    let logEntries = logs
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(
        (entry) => entry && entry.message && entry.message.includes("deleted:")
      )
      .map((entry) => {
        const match = entry.message.match(
          /File with id "(.*?)" deleted: "(.*?)"/
        );
        const fileId = match?.[1] || "Unknown";
        const fileName = match?.[2]?.trim() || "Unknown";

        return {
          User: entry.user,
          FileName: fileName,
          Method: entry.method,
          URL: entry.url,
          Message: `File "${fileName}" (ID: ${fileId}) telah dihapus oleh "${entry.user}"`,
          UserAgent: entry.userAgent,
          Time: entry.time,
        };
      });

    const now = new Date();
    logEntries = logEntries.filter((log) => {
      const date = new Date(log.Time);
      if (filterType === "daily")
        return date.toDateString() === now.toDateString();
      if (filterType === "weekly") {
        const lastWeek = new Date(now);
        lastWeek.setDate(now.getDate() - 7);
        return date >= lastWeek;
      }
      if (filterType === "monthly") {
        return (
          date.getMonth() === now.getMonth() &&
          date.getFullYear() === now.getFullYear()
        );
      }
      return true;
    });

    // Sort by time
    logEntries.sort((a, b) => new Date(b.Time) - new Date(a.Time));

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Deleted Files");

    worksheet.columns = Object.keys(logEntries[0] || {}).map((key) => ({
      header: key,
      key: key,
      width: 30,
    }));

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
    return new Response("Internal Server Error", { status: 500 });
  }
}
