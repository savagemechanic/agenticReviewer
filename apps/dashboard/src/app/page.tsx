import { fetchApi } from "@/lib/api";

interface Product {
  id: string;
  name: string;
  url: string;
  status: string;
  discoveredAt: string;
}

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  let products: Product[] = [];
  try {
    const res = await fetchApi<{ data: Product[] }>("/products");
    products = res.data;
  } catch {
    // API may not be running
  }

  const statusCounts = products.reduce(
    (acc, p) => {
      acc[p.status] = (acc[p.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const statuses = ["discovered", "processing", "processed", "summarized", "scored", "video_ready", "published"];

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Pipeline Overview</h2>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {statuses.map((status) => (
          <div key={status} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="text-3xl font-bold text-white">{statusCounts[status] ?? 0}</div>
            <div className="text-sm text-slate-400 capitalize">{status.replace("_", " ")}</div>
          </div>
        ))}
      </div>

      <h3 className="text-lg font-semibold mb-4">Recent Products</h3>
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="text-left p-4 text-slate-400 font-medium">Name</th>
              <th className="text-left p-4 text-slate-400 font-medium">Status</th>
              <th className="text-left p-4 text-slate-400 font-medium">Discovered</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 && (
              <tr>
                <td colSpan={3} className="p-4 text-slate-500 text-center">
                  No products yet. Run a discovery workflow to get started.
                </td>
              </tr>
            )}
            {products.map((product) => (
              <tr key={product.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                <td className="p-4">
                  <a href={`/products/${product.id}`} className="text-blue-400 hover:underline">
                    {product.name}
                  </a>
                </td>
                <td className="p-4">
                  <span className="px-2 py-1 rounded-full text-xs bg-slate-800 text-slate-300 capitalize">
                    {product.status.replace("_", " ")}
                  </span>
                </td>
                <td className="p-4 text-slate-400 text-sm">
                  {new Date(product.discoveredAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
