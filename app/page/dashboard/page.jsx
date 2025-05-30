"use client";

import { useEffect, useState } from "react";
import Card from "../../components/Card";
import PageWrapper from "../../components/PageWrapper";

export default function Dashboard() {
  const [loginCount, setLoginCount] = useState("Loading...");
  const [sesCount, setSesCount] = useState("Loading...");
  const [delCount, setDelCount] = useState("Loading...");
  const [createFileCount, setCreateFileCount] = useState("Loading...");
  const [createFolderCount, setCreateFolderCount] = useState("Loading...");
  const [shareCount, setShareCount] = useState("Loading...");

  // Fetch prioritas tinggi: login dan sesi
  useEffect(() => {
    async function fetchInitialData() {
      try {
        const [loginRes, sesRes] = await Promise.all([
          fetch("/api/login/count"),
          fetch("/api/session"),
        ]);

        const loginData = await loginRes.json();
        const sesData = await sesRes.json();

        if (loginRes.ok && loginData?.totalLoginSuccess !== undefined) {
          setLoginCount(loginData.totalLoginSuccess.toString());
        } else {
          setLoginCount("Error");
        }

        if (sesRes.ok && sesData?.online_users_count !== undefined) {
          setSesCount(sesData.online_users_count.toString());
        } else {
          setSesCount("Error");
        }

        // Setelah yang penting tampil, fetch sisanya di background
        fetchSecondaryData();
      } catch (error) {
        setLoginCount("Error");
        setSesCount("Error");
        // Tetap lanjutkan secondary fetch meskipun error awal
        fetchSecondaryData();
      }
    }

    async function fetchSecondaryData() {
      try {
        const delRes = await fetch("/api/delete/count");
        const delData = await delRes.json();
        setDelCount(
          delRes.ok && delData?.totalDeleteEvents !== undefined
            ? delData.totalDeleteEvents.toString()
            : "Error"
        );

        const createFileRes = await fetch("/api/createfile/count");
        const createFileData = await createFileRes.json();
        setCreateFileCount(
          createFileRes.ok &&
            createFileData?.totalCreateFileEvents !== undefined
            ? createFileData.totalCreateFileEvents.toString()
            : "Error"
        );

        const createFolderRes = await fetch("/api/createfolder/count");
        const createFolderData = await createFolderRes.json();
        setCreateFolderCount(
          createFolderRes.ok &&
            createFolderData?.totalCreateFolderEvents !== undefined
            ? createFolderData.totalCreateFolderEvents.toString()
            : "Error"
        );

        const shareRes = await fetch("/api/sharelog/count");
        const shareData = await shareRes.json();
        setShareCount(
          shareRes.ok && shareData?.totalSharedFiles !== undefined
            ? shareData.totalSharedFiles.toString()
            : "Error"
        );
      } catch (error) {
        setDelCount("Error");
        setCreateFileCount("Error");
        setCreateFolderCount("Error");
        setShareCount("Error");
      }
    }

    fetchInitialData();
  }, []);

  return (
    <PageWrapper>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-6">
        <Card title="Total Login Success" value={loginCount} />
        <Card title="Active Sessions" value={sesCount} />
        <Card title="Total Delete File" value={delCount} />
        <Card title="Total Created Files" value={createFileCount} />
        <Card title="Total Created Folders" value={createFolderCount} />
        <Card title="Total Share Events" value={shareCount} />
      </div>
    </PageWrapper>
  );
}
