export default function Dashboard() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Dashboard</h1>
      <p className="text-gray-600 mb-4">Scaffold: explore your library and projects.</p>
      <ul className="list-disc list-inside">
        <li><a className="text-blue-600 underline" href="/dashboard/items">Items</a></li>
      </ul>
    </div>
  )
}

