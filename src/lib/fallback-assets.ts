import artist1 from "@/assets/artist-1.jpg";
import artist2 from "@/assets/artist-2.jpg";
import artist3 from "@/assets/artist-3.jpg";
import artist4 from "@/assets/artist-4.jpg";
import artist5 from "@/assets/artist-5.jpg";
import artist6 from "@/assets/artist-6.jpg";
import productHoodie from "@/assets/product-hoodie.jpg";
import productTee from "@/assets/product-tee.jpg";
import productVinyl from "@/assets/product-vinyl.jpg";
import productSnapback from "@/assets/product-snapback.jpg";

// Fallback images keyed by artist slug — used when artists.image_url is null.
// Once admins upload real images via the dashboard, image_url takes precedence.
export const artistImageFallbacks: Record<string, string> = {
  "albee-al":     artist1,
  "elcamino":     artist2,
  "max-b":        artist3,
  "curly-gen":    artist4,
  "mercy-porter": artist5,
  "dex-osama":    artist6,
};

// Fallback images keyed by product slug.
export const productImageFallbacks: Record<string, string> = {
  "hoodie":   productHoodie,
  "tee":      productTee,
  "vinyl-1":  productVinyl,
  "snapback": productSnapback,
  "cd-1":     productVinyl,
  "poster":   artist3,
};

export function artistImage(slug: string, image_url: string | null): string {
  return image_url || artistImageFallbacks[slug] || artist1;
}

export function productImage(slug: string, image_url: string | null): string {
  return image_url || productImageFallbacks[slug] || productHoodie;
}
