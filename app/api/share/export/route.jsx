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

    const permissionMap = {
      1: "Read",
      3: "Read, Edit",
      5: "Read, Create",
      7: "Read, Create, Edit",
      9: "Read, Delete",
      11: "Read, Edit, Delete",
      13: "Read, Create, Delete",
      15: "Read, Create, Edit, Delete",
      17: "Read, Share",
      19: "Read, Edit, Share",
      21: "Read, Create, Share",
      23: "Read, Create, Edit, Share",
      25: "Read, Share, Delete",
      27: "Read, Edit, Share, Delete",
      29: "Read, Create, Share, Delete",
      31: "Read, Create, Edit, Share, Delete",
    };

    const logs = fs.readFileSync(logPath, "utf8").split("\n").filter(Boolean);

    const logEntries = logs
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
          entry.message.includes("has been shared to the user")
      )
      .map((entry) => {
        const match = entry.message.match(
          /The folder "(.*?)" .*? has been shared to the user "(.*?)" with permissions "(.*?)"/
        );
        const folderName = match?.[1] || "Unknown";
        const sharedTo = match?.[2] || "Unknown";
        const permissionCode = parseInt(match?.[3] || "0", 10);
        const permissionText =
          permissionMap[permissionCode] || `Permission ${permissionCode}`;

        return {
          User: entry.user,
          SharedTo: sharedTo,
          Method: entry.method,
          URL: entry.url,
          Message: `Folder "${folderName}" telah di-share oleh "${entry.user}" kepada "${sharedTo}" dengan izin ${permissionText}`,
          UserAgent: entry.userAgent,
          Time: entry.time,
        };
      });

    const now = new Date();
    const filtered = logEntries.filter((log) => {
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
    const worksheet = workbook.addWorksheet("Logs");

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
        "Content-Disposition": `attachment; filename="share-${filterType}-logs.xlsx"`,
      },
    });
  } catch (err) {
    return new Response("Internal Server Error", { status: 500 });
  }
}
