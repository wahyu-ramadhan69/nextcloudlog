"use client";

import { useEffect, useState } from "react";
import PageWrapper from "../../components/PageWrapper";

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    async function fetchOnlineUsers() {
      try {
        const res = await fetch("/api/session");
        const data = await res.json();

        if (res.ok) {
          // Data online_users berupa array nama login
          const formattedUsers = data.online_users.map((username, index) => ({
            id: index + 1,
            name: username,
            email: `${username}@bcaf.co.id`,
          }));
          setUsers(formattedUsers);
        } else {
          setErrorMsg(data?.error || "Terjadi kesalahan.");
        }
      } catch (error) {
        setErrorMsg("Gagal mengambil data dari server.");
      } finally {
        setLoading(false);
      }
    }

    fetchOnlineUsers();
  }, []);

  return (
    <PageWrapper>
      <h1 className="text-2xl font-bold mb-4">Online Users</h1>

      {loading ? (
        <p className="text-gray-500">Loading data...</p>
      ) : errorMsg ? (
        <p className="text-red-500">{errorMsg}</p>
      ) : users.length === 0 ? (
        <p className="text-gray-600">
          Tidak ada user yang aktif dalam 5 menit terakhir.
        </p>
      ) : (
        <div className="bg-white p-4 rounded-xl shadow hover:shadow-md transition">
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white rounded-lg shadow">
              <thead>
                <tr className="bg-gray-100 text-gray-600 uppercase text-sm leading-normal">
                  <th className="py-3 px-6 text-left">ID</th>
                  <th className="py-3 px-6 text-left">Name</th>
                  <th className="py-3 px-6 text-left">Email</th>
                </tr>
              </thead>
              <tbody className="text-gray-700 text-sm">
                {users.map((user) => (
                  <tr key={user.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-6">{user.id}</td>
                    <td className="py-3 px-6">{user.name}</td>
                    <td className="py-3 px-6">{user.email}</td>
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
