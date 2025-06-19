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
    const filter = searchParams.get("filter") || "all";
    const now = new Date();

    const fileStream = fs.createReadStream(logPath, { encoding: "utf8" });
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    const folderLogs = [];

    for await (const line of rl) {
      try {
        const entry = JSON.parse(line);

        const isFolderCreation =
          entry?.method === "MKCOL" &&
          entry?.message?.includes("written to:") &&
          entry?.url?.includes("/remote.php/dav/files/");

        if (!isFolderCreation) continue;

        const logDate = new Date(entry.time);
        let isIncluded = false;

        if (filter === "daily") {
          isIncluded = logDate.toDateString() === now.toDateString();
        } else if (filter === "weekly") {
          const oneWeekAgo = new Date(now);
          oneWeekAgo.setDate(now.getDate() - 7);
          isIncluded = logDate >= oneWeekAgo;
        } else if (filter === "monthly") {
          isIncluded =
            logDate.getMonth() === now.getMonth() &&
            logDate.getFullYear() === now.getFullYear();
        } else {
          isIncluded = true;
        }

        if (!isIncluded) continue;

        const match = entry.message.match(/File with id "(.*?)" written to:/);
        const folderId = match?.[1] || "Unknown";

        const urlMatch = entry.url.match(
          /\/remote\.php\/dav\/files\/[^/]+\/(.*)/
        );
        const folderPath = urlMatch
          ? decodeURIComponent(urlMatch[1])
          : "Unknown";

        folderLogs.push({
          User: entry.user,
          FolderID: folderId,
          Message: `Folder "${folderPath}" (ID: ${folderId}) dibuat oleh "${entry.user}"`,
          Path: folderPath,
          Waktu: entry.time,
        });
      } catch {
        // skip invalid lines
      }
    }

    // Urutkan berdasarkan waktu terbaru, ambil hanya 300 teratas
    folderLogs.sort((a, b) => new Date(b.Waktu) - new Date(a.Waktu));
    const latest300 = folderLogs.slice(0, 300).map((entry, index) => ({
      ID: index + 1,
      ...entry,
    }));

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Folder Creation Logs");

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
        "Content-Disposition": `attachment; filename="folder-create-${filter}-logs.xlsx"`,
      },
    });
  } catch (err) {
    console.error("Error exporting folder logs:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
}
