"use client";

import { useEffect, useState } from "react";
import PageWrapper from "../../components/PageWrapper";

export default function SharedFoldersPage() {
  const [unshareLogs, setUnshareLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [filterType, setFilterType] = useState("daily");

  useEffect(() => {
    async function fetchUnshareLogs() {
      setLoading(true);
      try {
        const res = await fetch(`/api/unshare?filter=${filterType}`);
        const data = await res.json();

        console.log(data);

        if (res.ok) {
          const formattedLogs = data.map((entry, index) => ({
            id: index + 1,
            user: entry.user || "Unknown",
            targetUser: entry.targetUser || "-",
            message: entry.message || "-",
            time: entry.time || "-",
          }));

          setUnshareLogs(formattedLogs);
        } else {
          setErrorMsg(data?.error || "Gagal memuat data unshare.");
        }
      } catch (error) {
        setErrorMsg("Terjadi kesalahan saat mengambil data.");
      } finally {
        setLoading(false);
      }
    }

    fetchUnshareLogs();
  }, [filterType]);

  return (
    <PageWrapper>
      <div className="flex justify-between items-center px-2">
        <h1 className="text-2xl font-bold mb-4">Log Unshare Folder</h1>

        <div className="mb-4">
          <label className="text-sm font-medium mr-2">Filter Waktu:</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1 text-sm"
          >
            <option value="daily">Harian</option>
            <option value="weekly">Mingguan</option>
            <option value="monthly">Bulanan</option>
            <option value="all">Semua</option>
          </select>
          <button
            onClick={() =>
              window.open(`/api/unshare/export?filter=${filterType}`, "_blank")
            }
            className="ml-3 bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 text-sm"
          >
            Download Excel
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500">Memuat data...</p>
      ) : errorMsg ? (
        <p className="text-red-500">{errorMsg}</p>
      ) : unshareLogs.length === 0 ? (
        <p className="text-gray-600">Belum ada folder yang di-unshare.</p>
      ) : (
        <div className="bg-white p-4 rounded-xl shadow hover:shadow-md transition">
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white rounded-lg shadow">
              <thead>
                <tr className="bg-gray-100 text-gray-600 uppercase text-sm leading-normal">
                  <th className="py-3 px-6 text-left">ID</th>
                  <th className="py-3 px-6 text-left">User</th>
                  <th className="py-3 px-6 text-left">Unshare To</th>
                  <th className="py-3 px-6 text-left">Deskripsi</th>
                  <th className="py-3 px-6 text-left">Waktu</th>
                </tr>
              </thead>
              <tbody className="text-gray-700 text-sm">
                {unshareLogs.map((item) => (
                  <tr key={item.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-6">{item.id}</td>
                    <td className="py-3 px-6">{item.user}</td>
                    <td className="py-3 px-6">{item.targetUser}</td>
                    <td className="py-3 px-6">{item.message}</td>
                    <td className="py-3 px-6">{item.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
