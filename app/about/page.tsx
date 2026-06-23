import Image from "next/image";

export const metadata = {
  title: "About Us | MV Fashion Accessories",
  description: "Learn about MV Fashion Accessories and our curated African fashion accessories.",
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-white text-gray-900">
      <section className="mx-auto flex min-h-[70vh] max-w-5xl flex-col items-center justify-center px-5 py-20 text-center sm:px-8">
        <p className="text-sm font-semibold uppercase tracking-[0.45em] text-gray-500">Our Story</p>
        <h1 className="mt-8 max-w-4xl font-serif text-4xl leading-tight text-gray-950 sm:text-6xl md:text-7xl">
          About MV Fashion Accessories
        </h1>

        <div className="mt-12 max-w-4xl space-y-8 text-xl leading-relaxed text-gray-500 sm:text-2xl sm:leading-relaxed">
          <p>
            Based in Ghana, MV Fashion Accessories curates premium jewelry, handbags, and slippers that honour
            African artistry. Every piece is selected for its quality, design, and the story it tells, bridging
            tradition with contemporary style.
          </p>
          <p>
            Whether you are dressing for a special occasion or elevating your everyday look, our collection offers
            accessories that make a statement without saying a word.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl grid-cols-1 gap-4 px-5 pb-20 sm:px-8 md:grid-cols-3">
        {[
          { src: "/hero.jpg", alt: "MV Fashion Accessories necklace collection" },
          { src: "/hero7.jpg", alt: "African print purse collection" },
          { src: "/hero4.jpg", alt: "MV Fashion Accessories handbag collection" },
        ].map((image) => (
          <div key={image.src} className="relative aspect-[4/5] overflow-hidden rounded-lg bg-gray-100">
            <Image src={image.src} alt={image.alt} fill sizes="(min-width: 768px) 33vw, 100vw" className="object-cover" />
          </div>
        ))}
      </section>
    </main>
  );
}
