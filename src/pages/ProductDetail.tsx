import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import { products } from "@/lib/data";
import { Minus, Plus } from "lucide-react";

const ProductDetail = () => {
  const { id } = useParams();
  const product = products.find((p) => p.id === id);
  const [quantity, setQuantity] = useState(1);
  const [size, setSize] = useState("M");

  if (!product) {
    return (
      <div className="min-h-screen bg-primary text-primary-foreground flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold uppercase mb-4">Product Not Found</h1>
          <Link to="/store" className="text-xs tracking-[0.2em] uppercase border-b border-primary-foreground pb-1">
            Back to Store
          </Link>
        </div>
      </div>
    );
  }

  const isApparel = product.category === "Clothing";
  const related = products.filter((p) => p.id !== product.id).slice(0, 3);

  return (
    <div>
      <div className="pt-20 bg-background">
        <div className="container-content section-padding">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Image */}
            <div className="aspect-square bg-secondary">
              <img src={product.image} alt={product.name} className="w-full h-full object-cover" width={800} height={800} />
            </div>

            {/* Info */}
            <div className="flex flex-col justify-center">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">{product.artist}</p>
              <h1 className="text-3xl md:text-4xl font-black uppercase mt-2">{product.name}</h1>
              <p className="text-2xl font-bold mt-4">${product.price}</p>

              {isApparel && (
                <div className="mt-8">
                  <p className="text-xs uppercase tracking-[0.2em] font-bold mb-3">Size</p>
                  <div className="flex gap-2">
                    {["S", "M", "L", "XL", "XXL"].map((s) => (
                      <button
                        key={s}
                        onClick={() => setSize(s)}
                        className={`w-12 h-12 text-xs font-bold border transition-colors ${
                          s === size ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-foreground"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div className="mt-8">
                <p className="text-xs uppercase tracking-[0.2em] font-bold mb-3">Quantity</p>
                <div className="flex items-center border border-border w-fit">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="p-3 hover:bg-secondary transition-colors">
                    <Minus size={14} />
                  </button>
                  <span className="px-6 text-sm font-bold">{quantity}</span>
                  <button onClick={() => setQuantity(quantity + 1)} className="p-3 hover:bg-secondary transition-colors">
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              <button className="mt-8 bg-primary text-primary-foreground px-10 py-4 text-xs tracking-[0.2em] uppercase font-bold hover:opacity-80 transition-opacity">
                Add to Cart
              </button>

              <p className="mt-8 text-sm text-muted-foreground leading-relaxed">
                Premium quality merchandise from PMG. Each piece is crafted with attention to detail and represents
                the culture of 100% independent music. Ships worldwide.
              </p>
            </div>
          </div>

          {/* Related */}
          <div className="mt-20 pt-12 border-t border-border">
            <h2 className="text-2xl font-bold uppercase tracking-wider mb-8">You May Also Like</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {related.map((p) => (
                <Link to={`/store/${p.id}`} key={p.id} className="group">
                  <div className="aspect-square bg-secondary hover-zoom">
                    <img src={p.image} alt={p.name} className="w-full h-full object-cover" loading="lazy" width={800} height={800} />
                  </div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mt-3">{p.artist}</p>
                  <p className="text-sm font-bold uppercase mt-1">{p.name}</p>
                  <p className="text-sm mt-1">${p.price}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
