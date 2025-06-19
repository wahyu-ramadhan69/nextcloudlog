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

    const uploadLogs = [];

    for await (const line of rl) {
      try {
        const entry = JSON.parse(line);

        const isUpload =
          entry?.method === "PUT" &&
          entry?.message?.includes("created:") &&
          entry?.url?.includes("/remote.php/dav/files/");

        if (!isUpload) continue;

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

        if (!isIncluded) continue;

        const match = entry.message.match(
          /File with id "(.*?)" created: "(.*?)"/
        );
        const fileId = match?.[1] || "Unknown";
        const fileName = match?.[2]?.trim() || "Unknown";

        uploadLogs.push({
          User: entry.user,
          FileName: fileName,
          FileID: fileId,
          URL: entry.url,
          Message: `File "${fileName}" (ID: ${fileId}) di-*upload* oleh "${entry.user}"`,
          UserAgent: entry.userAgent,
          Time: entry.time,
        });
      } catch {
        // Skip invalid lines
      }
    }

    // Urutkan berdasarkan waktu terbaru
    uploadLogs.sort((a, b) => new Date(b.Time) - new Date(a.Time));

    // Ambil hanya 300 data terbaru
    const latest300 = uploadLogs.slice(0, 300);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Upload Logs");

    if (latest300.length > 0) {
      worksheet.columns = Object.keys(latest300[0]).map((key) => ({
        header: key,
        key,
        width: 30,
      }));
    }

    latest300.forEach((entry) => {
      worksheet.addRow(entry);
    });

    const buffer = await workbook.xlsx.writeBuffer();

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="upload-${filterType}-logs.xlsx"`,
      },
    });
  } catch (err) {
    console.error("Error exporting upload logs:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
}
