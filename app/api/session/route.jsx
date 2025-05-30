import { db } from "../../../lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const [rows] = await db.query(`
      SELECT DISTINCT login_name
      FROM oc_authtoken
      WHERE last_activity >= UNIX_TIMESTAMP(NOW() - INTERVAL 5 MINUTE)
    `);

    return NextResponse.json({
      online_users_count: rows.length,
      online_users: rows.map((row) => row.login_name),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Gagal mengakses database",
        detail: error.message,
      },
      { status: 500 }
    );
  }
}
