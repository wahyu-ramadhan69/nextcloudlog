import fs from "fs";
import ExcelJS from "exceljs";

export async function GET(req) {
  try {
    const logPath = process.env.LOG_PATH;

    if (!logPath || !fs.existsSync(logPath)) {
      return new Response("Log file not found", { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const filterType = searchParams.get("filter") || "daily";

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
        (entry) =>
          entry &&
          entry.message &&
          entry.message.includes("File with id") &&
          entry.message.includes("created") &&
          entry.method === "MKCOL"
      )
      .map((entry) => {
        const match = entry.message.match(
          /File with id "(.*?)" created: "(.*?)"/
        );
        const folderName = match?.[2] || "Unknown";

        return {
          User: entry.user,
          FolderName: folderName,
          Method: entry.method,
          URL: entry.url,
          Message: `Folder dengan nama "${folderName}" telah dibuat oleh "${entry.user}"`,
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

    // Urutkan dari terbaru ke terlama
    logEntries.sort((a, b) => new Date(b.Time) - new Date(a.Time));

    // Buat file Excel
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Folder Created");

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
        "Content-Disposition": `attachment; filename="created-folders-${filterType}-logs.xlsx"`,
      },
    });
  } catch (err) {
    return new Response("Internal Server Error", { status: 500 });
  }
}
