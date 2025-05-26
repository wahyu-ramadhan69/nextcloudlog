import fs from "fs";
import readline from "readline";
import ExcelJS from "exceljs";
import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    const logPath = process.env.LOG_PATH;

    if (!logPath || !fs.existsSync(logPath)) {
      return new NextResponse(JSON.stringify({ error: "Log file not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { searchParams } = new URL(req.url);
    const filterType = searchParams.get("filter") || "all";
    const now = new Date();
    const folderLogs = [];

    const fileStream = fs.createReadStream(logPath, { encoding: "utf8" });
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    for await (const line of rl) {
      if (folderLogs.length >= 100) break;

      try {
        const entry = JSON.parse(line);

        const isDeleteMethod = entry.method === "DELETE";
        const isDeleteMessage = entry.message?.includes("File with id");
        const isFilesUrl = entry.url?.includes("/remote.php/dav/files/");

        if (isDeleteMethod && isDeleteMessage && isFilesUrl) {
          const pathParts = entry.url.split("/");
          const lastSegment = decodeURIComponent(pathParts.at(-1) || "");
          const isFolder = !lastSegment.includes(".");

          if (isFolder) {
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

            if (isIncluded) {
              const match = entry.message.match(
                /File with id "(.*?)" deleted: "(.*?)"/
              );
              const fileId = match?.[1] || "Unknown";

              folderLogs.push({
                time: entry.time,
                user: entry.user,
                method: entry.method,
                folderPath: decodeURIComponent(entry.url),
                message: `Folder dengan ID "${fileId}" telah dihapus oleh "${entry.user}"`,
                userAgent: entry.userAgent,
              });
            }
          }
        }
      } catch {
        // skip line
      }
    }

    // Urutkan dari terbaru ke terlama
    folderLogs.sort((a, b) => new Date(b.time) - new Date(a.time));

    // Generate Excel
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Deleted Folders");

    worksheet.columns = [
      { header: "Time", key: "time", width: 25 },
      { header: "User", key: "user", width: 20 },
      { header: "Method", key: "method", width: 10 },
      { header: "Folder Path", key: "folderPath", width: 50 },
      { header: "Message", key: "message", width: 60 },
      { header: "User Agent", key: "userAgent", width: 50 },
    ];

    worksheet.addRows(folderLogs);

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="log_folder_deleted_${filterType}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("Excel export error:", error);
    return new NextResponse(
      JSON.stringify({ error: "Internal Server Error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
