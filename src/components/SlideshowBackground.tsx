import { useEffect, useState } from 'react';

const IMAGES = [
  '/images/fasad_processed.jpeg',
  '/images/frame_01.jpg',
  '/images/frame_04.jpg',
  '/images/frame_23.jpg',
  '/images/frame_31.jpg',
  '/images/frame_58.jpg',
  '/images/church-opening.jpg',
];

export default function SlideshowBackground() {
  const [loaded, setLoaded] = useState<boolean[]>(IMAGES.map(() => false));
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    IMAGES.forEach((src, i) => {
      const img = new Image();
      img.src = src;
      img.onload = () => setLoaded(prev => { const n = [...prev]; n[i] = true; return n; });
    });
  }, []);

  useEffect(() => {
    if (loaded.every(Boolean)) {
      const interval = setInterval(() => setCurrent(prev => (prev + 1) % IMAGES.length), 15000);
      return () => clearInterval(interval);
    }
  }, [loaded]);

  return (
    <>
      {IMAGES.map((src, i) => (
        <div key={src} className="fixed inset-0">
          <div
            className={`absolute inset-0 bg-cover bg-center transition-all duration-[1500ms] ${
              i === current ? 'opacity-100 scale-100 blur-none' : 'opacity-0 scale-110 blur-sm'
            }`}
            style={{
              backgroundImage: `url(${src})`,
            }}
          />
          <div
            className={`absolute inset-0 transition-all duration-[1500ms] ${
              i === current ? 'opacity-100' : 'opacity-0'
            }`}
            style={{
              backgroundImage: `url(${src})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
        </div>
      ))}
      <div className="fixed inset-0 bg-gradient-to-b from-[#1B2838]/75 via-[#1B2838]/50 to-[#1B2838]/85" />
      <div className="fixed inset-0 bg-gradient-to-r from-[#1B2838]/30 to-transparent" />
      <div className="fixed top-20 right-10 h-72 w-72 rounded-full bg-[#5B9BD5]/8 blur-3xl" />
      <div className="fixed bottom-20 left-10 h-96 w-96 rounded-full bg-[#5B9BD5]/5 blur-3xl" />
    </>
  );
}
