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

    const unshareLogs = logs
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
          entry.message?.includes("has been unshared from the user") &&
          entry.method === "DELETE"
      )
      .map((entry) => {
        const match = entry.message.match(
          /The folder "(.*?)" with ID ".*?" has been unshared from the user "(.*?)"/
        );

        const folderName = match?.[1] || "Unknown";
        const targetUser = match?.[2] || "Unknown";

        return {
          User: entry.user,
          TargetUser: targetUser,
          FolderName: folderName,
          Method: entry.method,
          URL: entry.url,
          Message: `Folder "${folderName}" telah di-unshare oleh "${entry.user}" dari pengguna "${targetUser}"`,
          UserAgent: entry.userAgent,
          Time: entry.time,
        };
      });

    const now = new Date();
    const filtered = unshareLogs.filter((log) => {
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
    filtered.sort((a, b) => new Date(b.Time) - new Date(a.Time));

    // Create Excel
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Unshared Logs");

    worksheet.columns = Object.keys(filtered[0] || {}).map((key) => ({
      header: key,
      key: key,
      width: 30,
    }));

    filtered.forEach((item) => {
      worksheet.addRow(item);
    });

    const buffer = await workbook.xlsx.writeBuffer();

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="unshare-${filterType}-logs.xlsx"`,
      },
    });
  } catch (err) {
    return new Response("Internal Server Error", { status: 500 });
  }
}
