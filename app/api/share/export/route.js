import { db } from "../../../../lib/db";
import ExcelJS from "exceljs";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const filter = searchParams.get("filter") || "all";

  let whereClause = "fc.path LIKE '__groupfolders/%'";
  if (filter === "daily") {
    whereClause += " AND DATE(FROM_UNIXTIME(s.stime)) = CURDATE()";
  } else if (filter === "weekly") {
    whereClause +=
      " AND YEARWEEK(FROM_UNIXTIME(s.stime), 1) = YEARWEEK(CURDATE(), 1)";
  }

  const query = `
    SELECT 
      s.uid_owner AS shared_by,
      CASE s.share_type
        WHEN 0 THEN s.share_with
        WHEN 1 THEN CONCAT('Group: ', s.share_with)
        WHEN 3 THEN CONCAT('Public Link (token: ', s.token, ')')
        ELSE 'Other'
      END AS shared_to,
      CONCAT('/', gf.mount_point, '/', SUBSTRING_INDEX(fc.path, '/', -1)) AS full_path,
      FROM_UNIXTIME(s.stime) AS shared_at
    FROM 
      oc_share s
    JOIN 
      oc_filecache fc ON s.file_source = fc.fileid
    JOIN 
      oc_group_folders gf ON SUBSTRING_INDEX(SUBSTRING_INDEX(fc.path, '/', 2), '/', -1) = gf.folder_id
    WHERE 
      ${whereClause}
    ORDER BY 
      s.stime DESC
    LIMIT 500;
  `;

  try {
    const [rows] = await db.query(query);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Shared Folders");

    worksheet.columns = [
      { header: "No", key: "no", width: 5 },
      { header: "User", key: "shared_by", width: 20 },
      { header: "Shared To", key: "shared_to", width: 25 },
      { header: "Path", key: "full_path", width: 40 },
      { header: "Waktu Sharing", key: "shared_at", width: 25 },
    ];

    rows.forEach((row, index) => {
      worksheet.addRow({
        no: index + 1,
        ...row,
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename=shared_folders_${filter}.xlsx`,
      },
    });
  } catch (err) {
    console.error("Export error:", err);
    return new Response(JSON.stringify({ error: "Gagal mengekspor data" }), {
      status: 500,
    });
  }
}
