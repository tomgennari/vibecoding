export function VideoSection() {
  return (
    <section id="video" className="border-t border-slate-100 bg-[#f8fafc] py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <h2 className="text-center text-3xl font-bold text-[#00478E] md:text-4xl">
          El sueño del campus, en sus propias palabras
        </h2>
        <p className="mt-3 text-center text-lg text-[#64748b]">Video institucional del St. Andrew&apos;s Scots School</p>

        <div className="mx-auto mt-10 max-w-4xl overflow-hidden rounded-2xl shadow-xl ring-1 ring-slate-200">
          <div className="relative aspect-video w-full bg-black">
            <iframe
              title="Video institucional St. Andrew's Scots School"
              src="https://www.youtube.com/embed/33c0kz1Frhk"
              width="100%"
              height="100%"
              className="absolute inset-0 h-full w-full"
              frameBorder={0}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>

        <p className="mx-auto mt-8 max-w-2xl text-center text-base italic leading-relaxed text-[#64748b]">
          Un mismo sueño: unificar la comunidad en un campus del futuro — &ldquo;Sic itur ad astra&rdquo;.
        </p>
      </div>
    </section>
  );
}
