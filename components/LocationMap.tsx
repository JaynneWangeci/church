"use client";

import { MapPin, Navigation, ExternalLink } from "lucide-react";

export default function LocationMap() {
  const churchName = "AIPCA Bahati Cathedral";
  const address = "Bahati, Eastlands, Nairobi, Kenya";
  const mapsQuery = encodeURIComponent("AIPCA Bahati Cathedral Nairobi");
  const googleMapsUrl = `https://www.google.com/maps/search/${mapsQuery}`;
  const wazeUrl = `https://waze.com/ul?q=${mapsQuery}`;

  return (
    <section id="location" className="scroll-mt-16 bg-white px-4 py-24 md:py-32">
      <div className="mx-auto max-w-3xl">
        <div className="animate-slide-up text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-nobuk-muted px-4 py-1.5 text-xs font-medium text-nobuk uppercase tracking-wider">
            <MapPin size={12} />
            Location
          </span>
          <h2 className="mt-4 text-3xl font-bold text-nobuk md:text-4xl">
            Find Us
          </h2>
          <p className="mx-auto mt-3 max-w-md text-muted">
            Join us at AIPCA Bahati Cathedral for the Harambee service
          </p>
        </div>

        <div className="mt-8 animate-slide-up overflow-hidden rounded-2xl border border-gray-100 shadow-sm" style={{ animationDelay: "0.2s" }}>
          <div className="aspect-video w-full bg-slate">
            <iframe
              src={`https://www.google.com/maps/embed/v1/search?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || ""}&q=${mapsQuery}`}
              className="h-full w-full"
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="AIPCA Bahati Cathedral location"
            />
          </div>

          <div className="bg-white p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-nobuk-muted">
                <MapPin size={18} className="text-nobuk" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-ink">{churchName}</h3>
                <p className="text-sm text-muted">{address}</p>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-1 items-center justify-center gap-2 rounded-full bg-nobuk px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-nobuk-light"
              >
                <Navigation size={15} />
                Google Maps
                <ExternalLink size={12} />
              </a>
              <a
                href={wazeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-1 items-center justify-center gap-2 rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-muted transition hover:bg-slate"
              >
                <Navigation size={15} />
                Waze
                <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
