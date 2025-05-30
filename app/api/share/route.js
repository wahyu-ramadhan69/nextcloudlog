import { db } from "@/lib/db";

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
        s.id,
        s.uid_owner AS shared_by,
        CONCAT('/', gf.mount_point, '/', SUBSTRING_INDEX(fc.path, '/', -1)) AS full_path,
        FROM_UNIXTIME(s.stime) AS shared_at,
        CASE s.share_type
            WHEN 0 THEN s.share_with
            WHEN 1 THEN CONCAT('Group: ', s.share_with)
            WHEN 3 THEN CONCAT('Public Link (token: ', s.token, ')')
            ELSE 'Other'
        END AS shared_to
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
    LIMIT 50;
  `;

  try {
    const [rows] = await db.query(query);
    return Response.json(rows);
  } catch (err) {
    console.error("Query error:", err);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
