"use client";

import { useEffect, useState } from "react";
import Card from "../../components/Card";
import PageWrapper from "../../components/PageWrapper";
import CardServer from "../../components/CardServer";

export default function Dashboard() {
  const [loginCount, setLoginCount] = useState("Loading...");
  const [delCount, setDelCount] = useState("Loading...");
  const [sesCount, setSesCount] = useState("Loading...");
  const [createFileCount, setCreateFileCount] = useState("Loading...");
  const [createFolderCount, setCreateFolderCount] = useState("Loading...");
  const [shareCount, setShareCount] = useState("Loading...");

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const [
          loginRes,
          delRes,
          sesRes,
          createFileRes,
          createFolderRes,
          shareRes,
        ] = await Promise.all([
          fetch("/api/login/count"),
          fetch("/api/delete/count"),
          fetch("/api/session"),
          fetch("/api/createfile/count"),
          fetch("/api/createfolder/count"),
          fetch("/api/share/count"),
        ]);

        const loginData = await loginRes.json();
        const delData = await delRes.json();
        const sesData = await sesRes.json();
        const createFileData = await createFileRes.json();
        const createFolderData = await createFolderRes.json();
        const shareData = await shareRes.json();

        if (loginRes.ok && loginData?.totalLoginSuccess !== undefined) {
          setLoginCount(loginData.totalLoginSuccess.toString());
        } else {
          setLoginCount("Error");
        }

        if (delRes.ok && delData?.totalDeleteEvents !== undefined) {
          setDelCount(delData.totalDeleteEvents.toString());
        } else {
          setDelCount("Error");
        }

        if (sesRes.ok && sesData?.online_users_count !== undefined) {
          setSesCount(sesData.online_users_count.toString());
        } else {
          setSesCount("Error");
        }

        if (
          createFileRes.ok &&
          createFileData?.totalCreateFileEvents !== undefined
        ) {
          setCreateFileCount(createFileData.totalCreateFileEvents.toString());
        } else {
          setCreateFileCount("Error");
        }

        if (
          createFolderRes.ok &&
          createFolderData?.totalCreateFolderEvents !== undefined
        ) {
          setCreateFolderCount(
            createFolderData.totalCreateFolderEvents.toString()
          );
        } else {
          setCreateFolderCount("Error");
        }

        if (shareRes.ok && shareData?.totalSharedFiles !== undefined) {
          setShareCount(shareData.totalSharedFiles.toString());
        } else {
          setShareCount("Error");
        }
      } catch (error) {
        setLoginCount("Error");
        setDelCount("Error");
        setSesCount("Error");
        setCreateFileCount("Error");
        setCreateFolderCount("Error");
        setShareCount("Error");
      }
    }

    fetchDashboardData();
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
