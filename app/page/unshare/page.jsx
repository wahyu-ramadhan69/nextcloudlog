"use client";

import { useEffect, useState } from "react";
import PageWrapper from "../../components/PageWrapper";

export default function SharedFoldersPage() {
  const [sharedLogs, setSharedLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [filterType, setFilterType] = useState("daily");

  useEffect(() => {
    async function fetchLogs() {
      setLoading(true);
      try {
        const [createdRes, unshareRes] = await Promise.all([
          fetch(`/api/share?filter=${filterType}&type=created`),
          fetch(`/api/share?filter=${filterType}&type=unshare`),
        ]);

        const [createdData, unshareData] = await Promise.all([
          createdRes.json(),
          unshareRes.json(),
        ]);

        if (!createdRes.ok || !unshareRes.ok) {
          throw new Error(
            createdData.error || unshareData.error || "Gagal memuat data."
          );
        }

        // Format data agar konsisten
        const formatEntry = (data, actionType) =>
          data.map((entry, index) => ({
            id: `${actionType}-${index + 1}`,
            user: entry.user || "Unknown",
            message: entry.message || "-",
            time: entry.time || "-",
            action: actionType === "created" ? "Dibuat" : "Unshare",
          }));

        const merged = [
          ...formatEntry(createdData, "created"),
          ...formatEntry(unshareData, "unshare"),
        ];

        // Sort berdasarkan waktu terbaru
        merged.sort((a, b) => new Date(b.time) - new Date(a.time));

        setSharedLogs(merged);
      } catch (error) {
        setErrorMsg(error.message || "Terjadi kesalahan saat mengambil data.");
      } finally {
        setLoading(false);
      }
    }

    fetchLogs();
  }, [filterType]);

  return (
    <PageWrapper>
      <div className="flex justify-between items-center px-2">
        <h1 className="text-2xl font-bold mb-4">Daftar Folder UnShar</h1>

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
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500">Memuat data...</p>
      ) : errorMsg ? (
        <p className="text-red-500">{errorMsg}</p>
      ) : sharedLogs.length === 0 ? (
        <p className="text-gray-600">
          Belum ada aktivitas sharing atau unshare folder.
        </p>
      ) : (
        <div className="bg-white p-4 rounded-xl shadow hover:shadow-md transition">
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white rounded-lg shadow">
              <thead>
                <tr className="bg-gray-100 text-gray-600 uppercase text-sm leading-normal">
                  <th className="py-3 px-6 text-left">ID</th>
                  <th className="py-3 px-6 text-left">User</th>
                  <th className="py-3 px-6 text-left">Aksi</th>
                  <th className="py-3 px-6 text-left">Deskripsi</th>
                  <th className="py-3 px-6 text-left">Waktu</th>
                </tr>
              </thead>
              <tbody className="text-gray-700 text-sm">
                {sharedLogs.map((item) => (
                  <tr key={item.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-6">{item.id}</td>
                    <td className="py-3 px-6">{item.user}</td>
                    <td className="py-3 px-6">{item.action}</td>
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
