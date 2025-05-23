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

    const onlyOfficeLogs = [];

    for await (const line of rl) {
      try {
        const entry = JSON.parse(line);

        if (
          entry?.message?.includes("accessed:") &&
          entry?.url?.includes("/onlyoffice/")
        ) {
          const match = entry.message.match(
            /File with id "(.*?)" accessed: "(.*?)"/
          );
          const fileId = match?.[1] || "Unknown";
          const fileName = match?.[2]?.trim() || "Unknown";
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
            onlyOfficeLogs.push({
              User: entry.user,
              FileName: fileName,
              FileID: fileId,
              URL: entry.url,
              Message: `File "${fileName}" (ID: ${fileId}) diakses via OnlyOffice oleh "${entry.user}"`,
              UserAgent: entry.userAgent,
              Time: entry.time,
            });
          }
        }
      } catch {
        // Skip invalid JSON
      }
    }

    onlyOfficeLogs.sort((a, b) => new Date(b.Time) - new Date(a.Time));

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("OnlyOffice Access Logs");

    if (onlyOfficeLogs.length > 0) {
      worksheet.columns = Object.keys(onlyOfficeLogs[0]).map((key) => ({
        header: key,
        key,
        width: 30,
      }));
    }

    onlyOfficeLogs.forEach((entry) => {
      worksheet.addRow(entry);
    });

    const buffer = await workbook.xlsx.writeBuffer();

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="onlyoffice-${filterType}-logs.xlsx"`,
      },
    });
  } catch (err) {
    console.error("Error processing OnlyOffice logs:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
}
