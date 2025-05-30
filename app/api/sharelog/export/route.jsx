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
          entry.message &&
          entry.message.includes("has been shared to the user")
        ) {
          const match = entry.message.match(
            /The folder "(.*?)" .*? has been shared to the user "(.*?)" with permissions "(.*?)"/
          );
          const folderName = match?.[1] || "Unknown";
          const sharedTo = match?.[2] || "Unknown";
          const permissionCode = parseInt(match?.[3] || "0", 10);
          const permissionText =
            permissionMap[permissionCode] || `Permission ${permissionCode}`;

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
              SharedTo: sharedTo,
              Folder: folderName,
              Permission: permissionText,
              Method: entry.method,
              URL: entry.url,
              Message: `Folder "${folderName}" telah di-share oleh "${entry.user}" kepada "${sharedTo}" dengan izin ${permissionText}`,
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
