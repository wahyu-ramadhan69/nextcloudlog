import Image from "next/image";

export default function Header() {
  return (
    <header className="bg-white shadow px-6 py-4 flex items-center justify-between">
      <h1 className="text-xl font-semibold">Dashboard</h1>
      <div className="flex items-center space-x-4">
        <span className="text-gray-600">Welcome, Admin</span>
        <Image
          src="/batu.jpg"
          alt="Avatar"
          className="w-10 h-10 rounded-full"
          width={500}
          height={500}
        />
      </div>
    </header>
  );
}
