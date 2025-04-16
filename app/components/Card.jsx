export default function Card({ title, value }) {
  return (
    <div className="bg-white p-4 rounded-xl shadow hover:shadow-md transition">
      <h2 className="text-gray-500 text-sm mb-1">{title}</h2>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
