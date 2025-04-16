import { Home, Settings, User } from "lucide-react";
import Link from "next/link";
import {
  FcBusinessman,
  FcUpload,
  FcHome,
  FcShare,
  FcFullTrash,
  FcUp,
  FcSettings,
  FcUndo,
} from "react-icons/fc";

export default function Sidebar() {
  return (
    <aside className="w-64 bg-gray-200 border-r shadow-md hidden md:block">
      <div className="flex justify-items-center">
        <div className="p-6 text-xl font-semibold">NextCloud</div>
      </div>
      <nav className="px-6 space-y-2">
        <Link
          href="/page/dashboard"
          className="flex items-center p-2 text-gray-700 hover:bg-gray-100 rounded"
        >
          <FcHome className="w-5 h-5 mr-2" /> Dashboard
        </Link>
        <Link
          href="/page/users"
          className="flex items-center p-2 text-gray-700 hover:bg-gray-100 rounded"
        >
          <FcBusinessman className="w-5 h-5 mr-2" /> Active Users
        </Link>

        <Link
          href="/page/createfile"
          className="flex items-center p-2 text-gray-700 hover:bg-gray-100 rounded"
        >
          <FcUp className="w-5 h-5 mr-2" /> Upload File
        </Link>

        <Link
          href="/page/createfolder"
          className="flex items-center p-2 text-gray-700 hover:bg-gray-100 rounded"
        >
          <FcUpload className="w-5 h-5 mr-2" /> Upload Folder
        </Link>

        <Link
          href="/page/share"
          className="flex items-center p-2 text-gray-700 hover:bg-gray-100 rounded"
        >
          <FcShare className="w-5 h-5 mr-2" /> Share
        </Link>

        <Link
          href="/page/unshare"
          className="flex items-center p-2 text-gray-700 hover:bg-gray-100 rounded"
        >
          <FcUndo className="w-5 h-5 mr-2" /> UnShare
        </Link>

        <Link
          href="/page/delete"
          className="flex items-center p-2 text-gray-700 hover:bg-gray-100 rounded"
        >
          <FcFullTrash className="w-5 h-5 mr-2" /> Delete Files
        </Link>

        <Link
          href="/settings"
          className="flex items-center p-2 text-gray-700 hover:bg-gray-100 rounded"
        >
          <FcSettings className="w-5 h-5 mr-2" /> Settings
        </Link>
      </nav>
    </aside>
  );
}
