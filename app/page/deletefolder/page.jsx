"use client";

import { useEffect, useState } from "react";
import PageWrapper from "../../components/PageWrapper";

export default function DeletedFoldersPage() {
  const [folderLogs, setFolderLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [filterType, setFilterType] = useState("daily");

  useEffect(() => {
    async function fetchFolderLogs() {
      setLoading(true);
      try {
        const res = await fetch(`/api/deletefolder?filter=${filterType}`);
        const data = await res.json();

        if (res.ok) {
          const formatted = data.map((entry, index) => ({
            id: index + 1,
            user: entry.user || "Unknown",
            path: entry.folderPath || "-",
            message: entry.message || "-",
            time: entry.time || "-",
          }));

          setFolderLogs(formatted);
        } else {
          setErrorMsg(data?.error || "Gagal memuat data folder yang dihapus.");
        }
      } catch (err) {
        setErrorMsg("Terjadi kesalahan saat mengambil data.");
      } finally {
        setLoading(false);
      }
    }

    fetchFolderLogs();
  }, [filterType]);

  return (
    <PageWrapper>
      <div className="flex justify-between items-center px-2">
        <h1 className="text-2xl font-bold mb-4">Daftar Folder yang Dihapus</h1>

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
              window.open(
                `/api/deletefolder/export?filter=${filterType}`,
                "_blank"
              )
            }
            className="ml-3 bg-red-600 text-white px-3 py-1 rounded hover:bg-green-600 text-sm"
          >
            Download Excel
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500">Memuat data...</p>
      ) : errorMsg ? (
        <p className="text-red-500">{errorMsg}</p>
      ) : folderLogs.length === 0 ? (
        <p className="text-gray-600">Belum ada folder yang dihapus.</p>
      ) : (
        <div className="bg-white p-4 rounded-xl shadow hover:shadow-md transition">
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white rounded-lg shadow">
              <thead>
                <tr className="bg-gray-100 text-gray-600 uppercase text-sm leading-normal">
                  <th className="py-3 px-6 text-left">ID</th>
                  <th className="py-3 px-6 text-left">User</th>
                  <th className="py-3 px-6 text-left">Path</th>
                  <th className="py-3 px-6 text-left">Message</th>
                  <th className="py-3 px-6 text-left">Waktu</th>
                </tr>
              </thead>
              <tbody className="text-gray-700 text-sm">
                {folderLogs.map((item) => (
                  <tr key={item.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-6">{item.id}</td>
                    <td className="py-3 px-6">{item.user}</td>
                    <td className="py-3 px-6">{item.path}</td>
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
