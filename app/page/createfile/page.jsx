"use client";

import { useEffect, useState } from "react";
import PageWrapper from "../../components/PageWrapper";

export default function FileCreatedPage() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [filterType, setFilterType] = useState("daily");

  useEffect(() => {
    async function fetchCreatedFiles() {
      setLoading(true);
      try {
        const res = await fetch(`/api/createfile?filter=${filterType}`);
        const data = await res.json();

        if (res.ok) {
          const formattedFiles = data.map((file, index) => ({
            id: index + 1,
            name: file.user || "Unknown",
            fileName: file.message || "No message",
            timeUpload: file.time || "Unknown",
          }));

          setFiles(formattedFiles);
        } else {
          setErrorMsg(data?.error || "Terjadi kesalahan saat mengambil data.");
        }
      } catch (error) {
        setErrorMsg("Gagal mengambil data dari server.");
      } finally {
        setLoading(false);
      }
    }

    fetchCreatedFiles();
  }, [filterType]);

  return (
    <PageWrapper>
      <div className="flex justify-between items-center px-2">
        <h1 className="text-2xl font-bold mb-4">Daftar File yang Diupload</h1>
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
      ) : files.length === 0 ? (
        <p className="text-gray-600">Belum ada file yang diupload.</p>
      ) : (
        <div className="bg-white p-4 rounded-xl shadow hover:shadow-md transition">
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white rounded-lg shadow">
              <thead>
                <tr className="bg-gray-100 text-gray-600 uppercase text-sm leading-normal">
                  <th className="py-3 px-6 text-left">ID</th>
                  <th className="py-3 px-6 text-left">User</th>
                  <th className="py-3 px-6 text-left">Message</th>
                  <th className="py-3 px-6 text-left">Waktu</th>
                </tr>
              </thead>
              <tbody className="text-gray-700 text-sm">
                {files.map((file) => (
                  <tr key={file.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-6">{file.id}</td>
                    <td className="py-3 px-6">{file.name}</td>
                    <td className="py-3 px-6">{file.fileName}</td>
                    <td className="py-3 px-6">{file.timeUpload}</td>
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
