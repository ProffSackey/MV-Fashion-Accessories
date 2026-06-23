"use client";

import Image from "next/image";

export default function HeroCarousel() {
  return (
    <section className="relative w-full h-screen sm:h-[500px] md:h-[600px] xl:h-[700px] overflow-hidden" aria-label="Hero">

      {/* Mosaic grid background (responsive for all sizes) */}
      <div className="absolute inset-0">
        <div className="grid h-full grid-cols-2 gap-3 p-3 sm:grid-cols-3 sm:gap-4 sm:p-5 md:grid-cols-4 md:grid-rows-3 md:gap-5 md:p-6">
          <div className="relative min-h-0 overflow-hidden rounded-2xl bg-stone-100 shadow-lg ring-1 ring-white/20 md:col-span-2 md:row-span-3">
            <Image
              src="/hero.jpg"
              alt=""
              fill
              priority
              sizes="(min-width: 768px) 50vw, 50vw"
              className="object-cover object-center"
            />
          </div>

          <div className="relative min-h-0 overflow-hidden rounded-2xl bg-stone-100 shadow-lg ring-1 ring-white/20 md:col-span-2 md:row-span-1">
            <Image
              src="/hero6.jpg"
              alt=""
              fill
              priority
              sizes="(min-width: 768px) 50vw, 50vw"
              className="object-cover object-center"
            />
          </div>

          <div className="relative min-h-0 overflow-hidden rounded-2xl bg-stone-100 shadow-lg ring-1 ring-white/20 md:col-span-1 md:row-span-1">
            <Image
              src="/hero1.jpg"
              alt=""
              fill
              sizes="(min-width: 768px) 25vw, 50vw"
              className="object-cover object-center"
            />
          </div>

          <div className="relative min-h-0 overflow-hidden rounded-2xl bg-stone-100 shadow-lg ring-1 ring-white/20 md:col-span-1 md:row-span-2">
            <Image
              src="/hero7.jpg"
              alt=""
              fill
              sizes="(min-width: 768px) 25vw, 50vw"
              className="object-cover object-center"
            />
          </div>

          <div className="relative min-h-0 overflow-hidden rounded-2xl bg-stone-100 shadow-lg ring-1 ring-white/20 md:col-span-1 md:row-span-1">
            <Image
              src="/hero3.jpg"
              alt=""
              fill
              sizes="(min-width: 768px) 25vw, 50vw"
              className="object-cover object-center"
            />
          </div>

          <div className="relative min-h-0 overflow-hidden rounded-2xl bg-stone-100 shadow-lg ring-1 ring-white/20 md:col-span-1 md:row-span-1">
            <Image
              src="/hero4.jpg"
              alt=""
              fill
              sizes="(min-width: 768px) 25vw, 50vw"
              className="object-cover object-center"
            />
          </div>
        </div>
      </div>

      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />

      <div className="absolute inset-0 flex items-center justify-center">
        <div className="max-w-3xl px-6 sm:px-12 lg:px-16 text-center">
          <div className="text-yellow-300 tracking-widest uppercase text-sm mb-4">AFRICAN FASHION ACCESSORIES</div>

          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-white leading-tight drop-shadow-lg">
            <span className="block">Elegance Rooted in</span>
            <span className="block">Culture</span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-white/90 max-w-xl mx-auto">
            Discover handpicked jewelry, handbags & slippers that celebrate African heritage with modern sophistication.
          </p>

          <div className="mt-8 flex items-center justify-center gap-4">
            <a
              href="#featured-products"
              className="bg-yellow-500 hover:bg-yellow-700 text-gray-900 font-semibold px-8 py-3 rounded-md shadow-md transition"
              aria-label="Shop now"
            >
              SHOP NOW
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
