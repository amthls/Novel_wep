'use client';

import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';
import SmartImage from '@/components/common/SmartImage';

interface SmartPostGalleryProps {
  images: string[];
  altTitle?: string;
}

export default function SmartPostGallery({ images = [], altTitle = 'Hình ảnh bài viết' }: SmartPostGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (!images || images.length === 0) return null;

  const total = images.length;

  const openLightbox = (index: number) => setLightboxIndex(index);
  const closeLightbox = () => setLightboxIndex(null);

  const prevImage = () => {
    if (lightboxIndex !== null) {
      setLightboxIndex((lightboxIndex - 1 + total) % total);
    }
  };

  const nextImage = () => {
    if (lightboxIndex !== null) {
      setLightboxIndex((lightboxIndex + 1) % total);
    }
  };

  return (
    <>
      {/* 1. SMART ADAPTIVE GALLERY GRID */}
      <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/30 shadow-md">
        
        {/* Scenario 1: 1 Single Image */}
        {total === 1 && (
          <div 
            onClick={() => openLightbox(0)}
            className="cursor-pointer max-h-[500px] overflow-hidden group relative"
          >
            <SmartImage
              src={images[0]}
              alt={altTitle}
              className="w-full h-full max-h-[500px] object-cover group-hover:scale-[1.01] transition-transform duration-300"
            />
          </div>
        )}

        {/* Scenario 2: 2 Images (Side by Side) */}
        {total === 2 && (
          <div className="grid grid-cols-2 gap-1 max-h-[400px]">
            {images.map((url, idx) => (
              <div 
                key={idx}
                onClick={() => openLightbox(idx)}
                className="cursor-pointer aspect-[4/3] overflow-hidden group relative"
              >
                <SmartImage
                  src={url}
                  alt={`${altTitle} ${idx + 1}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
            ))}
          </div>
        )}

        {/* Scenario 3: 3 Images (1 Big Left + 2 Stacked Right) */}
        {total === 3 && (
          <div className="grid grid-cols-3 gap-1 max-h-[420px]">
            <div 
              onClick={() => openLightbox(0)}
              className="col-span-2 cursor-pointer aspect-[4/3] sm:aspect-auto h-full overflow-hidden group relative"
            >
              <SmartImage
                src={images[0]}
                alt={`${altTitle} 1`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            <div className="col-span-1 grid grid-rows-2 gap-1">
              {images.slice(1, 3).map((url, idx) => (
                <div 
                  key={idx + 1}
                  onClick={() => openLightbox(idx + 1)}
                  className="cursor-pointer aspect-[4/3] overflow-hidden group relative"
                >
                  <SmartImage
                    src={url}
                    alt={`${altTitle} ${idx + 2}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Scenario 4: 4 Images (2x2 Grid) */}
        {total === 4 && (
          <div className="grid grid-cols-2 gap-1 max-h-[420px]">
            {images.map((url, idx) => (
              <div 
                key={idx}
                onClick={() => openLightbox(idx)}
                className="cursor-pointer aspect-[4/3] overflow-hidden group relative"
              >
                <SmartImage
                  src={url}
                  alt={`${altTitle} ${idx + 1}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
            ))}
          </div>
        )}

        {/* Scenario 5: 5+ Images (2x2 Grid with +N Overlay on the 4th item) */}
        {total >= 5 && (
          <div className="grid grid-cols-2 gap-1 max-h-[420px]">
            {images.slice(0, 3).map((url, idx) => (
              <div 
                key={idx}
                onClick={() => openLightbox(idx)}
                className="cursor-pointer aspect-[4/3] overflow-hidden group relative"
              >
                <SmartImage
                  src={url}
                  alt={`${altTitle} ${idx + 1}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
            ))}

            {/* 4th item with overlay */}
            <div 
              onClick={() => openLightbox(3)}
              className="cursor-pointer aspect-[4/3] overflow-hidden relative group"
            >
              <SmartImage
                src={images[3]}
                alt={`${altTitle} 4`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px] flex items-center justify-center text-white font-extrabold text-xl sm:text-2xl group-hover:bg-black/60 transition-colors">
                +{total - 3} ảnh
              </div>
            </div>
          </div>
        )}

      </div>

      {/* 2. FULLSCREEN LIGHTBOX VIEWER */}
      {lightboxIndex !== null && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in"
          onClick={closeLightbox}
        >
          {/* Close button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition z-10"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Counter badge */}
          <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-bold backdrop-blur-sm z-10">
            {lightboxIndex + 1} / {total}
          </div>

          {/* Prev button */}
          {total > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); prevImage(); }}
              className="absolute left-4 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition z-10"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {/* Main image container */}
          <div 
            className="max-w-5xl max-h-[85vh] overflow-hidden rounded-2xl flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <SmartImage
              src={images[lightboxIndex]}
              alt={`${altTitle} full`}
              className="max-w-full max-h-[85vh] object-contain shadow-2xl"
            />
          </div>

          {/* Next button */}
          {total > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); nextImage(); }}
              className="absolute right-4 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition z-10"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}
        </div>
      )}
    </>
  );
}
