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
    const logEntries = [];

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
          entry.message.includes("File with id") &&
          entry.message.includes("created") &&
          entry.method !== "MKCOL"
        ) {
          const match = entry.message.match(
            /File with id "(.*?)" created: "(.*?)"/
          );
          const fileName = match?.[2] || "Unknown";

          const logTime = new Date(entry.time);
          let isIncluded = false;

          if (filterType === "daily") {
            isIncluded = logTime.toDateString() === now.toDateString();
          } else if (filterType === "weekly") {
            const lastWeek = new Date(now);
            lastWeek.setDate(now.getDate() - 7);
            isIncluded = logTime >= lastWeek;
          } else if (filterType === "monthly") {
            isIncluded =
              logTime.getMonth() === now.getMonth() &&
              logTime.getFullYear() === now.getFullYear();
          } else {
            isIncluded = true;
          }

          if (isIncluded) {
            logEntries.push({
              User: entry.user,
              FileName: fileName,
              Method: entry.method,
              URL: entry.url,
              Message: `File dengan nama "${fileName}" telah diupload/dibuat oleh "${entry.user}"`,
              UserAgent: entry.userAgent,
              Time: entry.time,
            });
          }
        }
      } catch {
        // abaikan baris tidak valid
      }
    }

    // Urutkan dari terbaru ke terlama
    logEntries.sort((a, b) => new Date(b.Time) - new Date(a.Time));

    // Batasi hanya 5000 entri terbaru yang akan diekspor
    const exportEntries = logEntries.slice(0, 1000);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Files Created");

    worksheet.columns = Object.keys(exportEntries[0] || {}).map((key) => ({
      header: key,
      key: key,
      width: 30,
    }));

    exportEntries.forEach((entry) => {
      worksheet.addRow(entry);
    });

    const buffer = await workbook.xlsx.writeBuffer();

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="created-files-${filterType}-logs.xlsx"`,
      },
    });
  } catch (err) {
    return new Response("Internal Server Error", { status: 500 });
  }
}
