import { db } from "../../../../lib/db";
import ExcelJS from "exceljs";

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
      FROM_UNIXTIME(s.stime) AS shared_at,
      s.permissions
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
      { header: "Shared To", key: "shared_to", width: 30 },
      { header: "Path", key: "full_path", width: 40 },
      { header: "Waktu Sharing", key: "shared_at", width: 25 },
      { header: "Permission", key: "permission_text", width: 35 },
    ];

    rows.forEach((row, index) => {
      worksheet.addRow({
        no: index + 1,
        shared_by: row.shared_by,
        shared_to: row.shared_to,
        full_path: row.full_path,
        shared_at: row.shared_at,
        permission_text:
          permissionMap[row.permissions] || `Unknown (${row.permissions})`,
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
