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
    const filterType = searchParams.get("filter") || "daily";

    const now = new Date();
    const filtered = [];

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
          entry.message?.includes("has been unshared from the user") &&
          entry.method === "DELETE"
        ) {
          const match = entry.message.match(
            /The folder "(.*?)" with ID ".*?" has been unshared from the user "(.*?)"/
          );

          const folderName = match?.[1] || "Unknown";
          const targetUser = match?.[2] || "Unknown";

          const logDate = new Date(entry.time);
          let isIncluded = false;

          if (filterType === "daily") {
            isIncluded = logDate.toDateString() === now.toDateString();
          } else if (filterType === "weekly") {
            const lastWeek = new Date(now);
            lastWeek.setDate(now.getDate() - 7);
            isIncluded = logDate >= lastWeek;
          } else if (filterType === "monthly") {
            isIncluded =
              logDate.getMonth() === now.getMonth() &&
              logDate.getFullYear() === now.getFullYear();
          } else {
            isIncluded = true;
          }

          if (isIncluded) {
            filtered.push({
              User: entry.user,
              TargetUser: targetUser,
              FolderName: folderName,
              Method: entry.method,
              URL: entry.url,
              Message: `Folder "${folderName}" telah di-unshare oleh "${entry.user}" dari pengguna "${targetUser}"`,
              UserAgent: entry.userAgent,
              Time: entry.time,
            });
          }
        }
      } catch {
        // skip
      }
    }

    filtered.sort((a, b) => new Date(b.Time) - new Date(a.Time));

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
