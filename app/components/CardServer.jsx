export default function CardServer({
  title,
  version,
  phpVersion,
  nginxVersion,
  totalRam,
  freeRam,
  freeStorage,
}) {
  const usedRam = totalRam - freeRam;
  const ramPercent = ((usedRam / totalRam) * 100).toFixed(1);
  return (
    <div className="bg-white p-4 rounded-xl shadow hover:shadow-md transition">
      <h2 className="text-3xl font-bold mb-1">{title}</h2>

      <p className="text-sm text-gray-500 mb-1">Nextcloud Version: {version}</p>
      <p className="text-sm text-gray-500 mb-1">PHP Version: {phpVersion}</p>
      <p className="text-sm text-gray-500 mb-1">
        Nginx Version: {nginxVersion}
      </p>

      {/* RAM Usage */}
      <p className="text-sm text-gray-500 mt-4 mb-1">RAM Usage</p>
      <div className="w-full h-3 bg-gray-200 rounded-full">
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-300"
          style={{ width: `${ramPercent}%` }}
        ></div>
      </div>

      {/* Storage Usage */}
      <p className="text-sm text-gray-500 mt-4 mb-1">Storage Usage</p>
      <div className="w-full h-3 bg-gray-200 rounded-full">
        <div
          className="h-full bg-green-500 rounded-full transition-all duration-300"
          style={{ width: `${70}%` }}
        ></div>
      </div>
    </div>
  );
}
