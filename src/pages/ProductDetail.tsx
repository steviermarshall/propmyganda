import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Minus, Plus, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { productImage } from "@/lib/fallback-assets";

type Product = Database["public"]["Tables"]["products"]["Row"];

const ProductDetail = () => {
  const { id: slug } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [size, setSize] = useState<string>("M");

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;

    (async () => {
      const { data: p } = await supabase
        .from("products")
        .select("*")
        .eq("slug", slug)
        .eq("active", true)
        .maybeSingle();

      if (cancelled) return;

      if (!p) {
        setLoading(false);
        return;
      }

      setProduct(p as Product);
      if ((p as Product).sizes?.length) setSize((p as Product).sizes[Math.floor((p as Product).sizes.length / 2)]);

      const { data: rel } = await supabase
        .from("products")
        .select("*")
        .eq("active", true)
        .neq("id", (p as Product).id)
        .limit(3);

      if (cancelled) return;
      setRelated((rel ?? []) as Product[]);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-xs tracking-widest uppercase text-muted-foreground">Loading…</p>
      </div>
    );
  }

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

  const sizes = product.sizes && product.sizes.length > 0 ? product.sizes : null;
  const isOOS = product.inventory !== null && product.inventory <= 0;

  return (
    <div>
      <div className="pt-20 bg-background">
        <div className="container-content section-padding">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Image */}
            <div className="aspect-square bg-secondary">
              <img
                src={productImage(product.slug, product.image_url)}
                alt={product.name}
                className="w-full h-full object-cover"
                width={800}
                height={800}
              />
            </div>

            {/* Info */}
            <div className="flex flex-col justify-center">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">{product.artist}</p>
              <h1 className="text-3xl md:text-4xl font-black uppercase mt-2">{product.name}</h1>
              <p className="text-2xl font-bold mt-4">${(product.price_cents / 100).toFixed(0)}</p>

              {sizes && (
                <div className="mt-8">
                  <p className="text-xs uppercase tracking-[0.2em] font-bold mb-3">Size</p>
                  <div className="flex gap-2">
                    {sizes.map((s) => (
                      <button
                        key={s}
                        onClick={() => setSize(s)}
                        className={`min-w-[3rem] h-12 px-3 text-xs font-bold border transition-colors ${
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

              {product.external_url ? (
                <a
                  href={product.external_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-8 bg-primary text-primary-foreground px-10 py-4 text-xs tracking-[0.2em] uppercase font-bold hover:opacity-80 transition-opacity inline-flex items-center gap-3 self-start"
                >
                  Buy Now <ExternalLink size={14} />
                </a>
              ) : (
                <button
                  disabled={isOOS}
                  className="mt-8 bg-primary text-primary-foreground px-10 py-4 text-xs tracking-[0.2em] uppercase font-bold hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed self-start"
                >
                  {isOOS ? "Sold Out" : "Add to Cart"}
                </button>
              )}

              {product.description && (
                <p className="mt-8 text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                  {product.description}
                </p>
              )}
            </div>
          </div>

          {/* Related */}
          {related.length > 0 && (
            <div className="mt-20 pt-12 border-t border-border">
              <h2 className="text-2xl font-bold uppercase tracking-wider mb-8">You May Also Like</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {related.map((p) => (
                  <Link to={`/store/${p.slug}`} key={p.id} className="group">
                    <div className="aspect-square bg-secondary hover-zoom">
                      <img
                        src={productImage(p.slug, p.image_url)}
                        alt={p.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        width={800}
                        height={800}
                      />
                    </div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground mt-3">{p.artist}</p>
                    <p className="text-sm font-bold uppercase mt-1">{p.name}</p>
                    <p className="text-sm mt-1">${(p.price_cents / 100).toFixed(0)}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
