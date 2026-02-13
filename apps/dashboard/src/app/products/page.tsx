import { fetchApi } from "@/lib/api";

interface Product {
  id: string;
  name: string;
  url: string;
  source: string;
  status: string;
  discoveredAt: string;
}

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  let products: Product[] = [];
  try {
    const res = await fetchApi<{ data: Product[] }>("/products");
    products = res.data;
  } catch {
    // API may not be running
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Products</h2>
      <div className="space-y-3">
        {products.map((product) => (
          <div key={product.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
            <div>
              <a href={`/products/${product.id}`} className="text-lg font-medium text-blue-400 hover:underline">
                {product.name}
              </a>
              <p className="text-sm text-slate-500">{product.url}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400 capitalize">{product.source}</span>
              <span className="px-2 py-1 rounded-full text-xs bg-slate-800 text-slate-300 capitalize">
                {product.status.replace("_", " ")}
              </span>
            </div>
          </div>
        ))}
        {products.length === 0 && (
          <p className="text-slate-500 text-center py-8">No products discovered yet.</p>
        )}
      </div>
    </div>
  );
}
