import React, { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import { Banner } from '../types';

interface HeroBannerProps {
  banners: Banner[];
  onSelectCategoryBySlug: (slug: string) => void;
}

export default function HeroBanner({ banners, onSelectCategoryBySlug }: HeroBannerProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [banners]);

  if (banners.length === 0) return null;

  const handlePrev = () => {
    setCurrentSlide(prev => (prev - 1 + banners.length) % banners.length);
  };

  const handleNext = () => {
    setCurrentSlide(prev => (prev + 1) % banners.length);
  };

  const activeBanner = banners[currentSlide];

  // Extracts category slug from banner links like '/category/school-stationery'
  const handleBannerClick = () => {
    if (activeBanner.link) {
      const parts = activeBanner.link.split('/');
      const slug = parts[parts.length - 1];
      onSelectCategoryBySlug(slug);
    }
  };

  return (
    <div className="relative bg-emerald-950 text-white rounded-3xl overflow-hidden h-[240px] sm:h-[350px] md:h-[400px] shadow-lg max-w-7xl mx-auto my-4 border border-emerald-900 group" id="hero-banner-slider">
      {/* Slider Image Background */}
      <div className="absolute inset-0 select-none">
        <img
          src={activeBanner.image}
          alt={activeBanner.title}
          className="w-full h-full object-cover opacity-35 transition-all duration-700 ease-in-out scale-100 group-hover:scale-102"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-950 via-emerald-950/80 to-transparent" />
      </div>

      {/* Content */}
      <div className="absolute inset-y-0 left-0 max-w-lg flex flex-col justify-center px-6 sm:px-12 md:px-16 space-y-3 sm:space-y-4 z-10">
        <span className="inline-flex items-center gap-1 bg-emerald-700/80 border border-emerald-500/30 text-emerald-300 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full w-fit">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Pakistan's Premium Stationery Hub</span>
        </span>
        
        <h2 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight text-white leading-tight">
          {activeBanner.title}
        </h2>
        
        {activeBanner.subtitle && (
          <p className="text-xs sm:text-sm text-gray-200 font-medium leading-relaxed max-w-sm line-clamp-2">
            {activeBanner.subtitle}
          </p>
        )}

        <button
          onClick={handleBannerClick}
          className="bg-amber-400 hover:bg-amber-500 text-slate-900 font-extrabold text-xs sm:text-sm px-5 py-2.5 rounded-xl transition shadow-md shadow-amber-400/10 w-fit"
        >
          Explore Collection
        </button>
      </div>

      {/* Left & Right Chevron Controls */}
      {banners.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 hover:scale-105 active:scale-95 transition text-white opacity-0 group-hover:opacity-100 hidden sm:block z-20"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 hover:scale-105 active:scale-95 transition text-white opacity-0 group-hover:opacity-100 hidden sm:block z-20"
          >
            <ArrowRight className="w-5 h-5" />
          </button>

          {/* Dots Indicator */}
          <div className="absolute bottom-4 right-1/2 translate-x-1/2 flex gap-1.5 z-20">
            {banners.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  currentSlide === idx ? 'w-5 bg-amber-400' : 'w-1.5 bg-white/40'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
