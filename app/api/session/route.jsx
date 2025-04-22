// app/api/online-users/route.js

import mysql from "mysql2/promise";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const connection = await mysql.createConnection({
      host: "192.168.1.133", // ganti dengan host MySQL kamu
      user: "root", // user MySQL Nextcloud
      password: "P@ssw0rd", // password MySQL
      database: "nextcloud", // nama database Nextcloud
    });

    // Ambil login_name yang aktif dalam 5 menit terakhir
    const [rows] = await connection.execute(`
      SELECT DISTINCT login_name
      FROM oc_authtoken
      WHERE last_activity >= UNIX_TIMESTAMP(NOW() - INTERVAL 5 MINUTE)
    `);

    await connection.end();

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
