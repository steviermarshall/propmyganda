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

export const artists = [
  { id: "albee-al", name: "Albee Al", genre: "Hip-Hop", image: artist1 },
  { id: "elcamino", name: "ElCamino", genre: "Hip-Hop", image: artist2 },
  { id: "max-b", name: "Max B", genre: "Hip-Hop / Wave", image: artist3 },
  { id: "chuckiee", name: "Chuckiee", genre: "Hip-Hop", image: artist4, albumCover: "https://i.scdn.co/image/ab67616d00001e028bdb869e02fbabe01eba5997", spotifyAlbumId: "09yHSWrCmaKUbyKuI31yFW", bio: "Brooklyn-bred and fully independent, Chuckiee is one of Propmyganda's most distinctive voices. His 2025 project 'i guess im the bad guy ..' marked a turning point — raw, experimental hip-hop that refuses to fit a mold. With tracks like 'angel convo' and 'BUTTON EYES!', he's building something real, on his own terms." },
  { id: "mercy-porter", name: "Mercy Porter", genre: "R&B / Hip-Hop", image: artist5 },
  { id: "dex-osama", name: "Dex Osama", genre: "Hip-Hop", image: artist6 },
];

export const products = [
  { id: "hoodie", name: "PMG Logo Hoodie", artist: "PMG", price: 65, category: "Clothing", image: productHoodie },
  { id: "tee", name: "PMG Logo Tee", artist: "PMG", price: 35, category: "Clothing", image: productTee },
  { id: "vinyl-1", name: "Albee Al Vinyl", artist: "Albee Al", price: 25, category: "Music", image: productVinyl },
  { id: "snapback", name: "PMG Snapback", artist: "PMG", price: 30, category: "Accessories", image: productSnapback },
  { id: "cd-1", name: "ElCamino Limited CD", artist: "ElCamino", price: 15, category: "Music", image: productVinyl },
  { id: "poster", name: "Max B Poster", artist: "Max B", price: 20, category: "Accessories", image: artist3 },
];

export const newsArticles = [
  {
    id: 1,
    title: "PMG Announces New Distribution Partnership",
    excerpt: "Expanding reach across all major digital platforms with a new strategic alliance.",
    category: "Business",
    featured: true,
  },
  {
    id: 2,
    title: "ElCamino Signs Exclusive Content Deal with PMG",
    excerpt: "A new chapter in independent hip-hop distribution.",
    category: "Artists",
  },
  {
    id: 3,
    title: "Inside the PMG Studio: Brooklyn's Independent Powerhouse",
    excerpt: "A look behind the scenes at the heart of independent music.",
    category: "Culture",
  },
  {
    id: 4,
    title: "Max B Catalog Surpasses 100M Streams",
    excerpt: "The wave continues to grow across all platforms.",
    category: "Milestones",
  },
];
