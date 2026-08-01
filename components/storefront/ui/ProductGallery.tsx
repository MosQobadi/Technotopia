"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/cn";

interface ProductGalleryProps {
  images: string[];
  alt: string;
  className?: string;
}

export function ProductGallery({ images, alt, className }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeImage = images[activeIndex];

  return (
    <div className={className}>
      <div className="bg-surface-200 relative mb-3 aspect-square overflow-hidden rounded-3xl">
        {activeImage ? (
          <Image src={activeImage} alt={alt} fill className="object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center font-mono text-[13px] text-gray-500">
            PRODUCT PHOTO
          </div>
        )}
      </div>
      {images.length > 1 && (
        <div className="flex gap-2.5">
          {images.map((image, index) => (
            <button
              key={image}
              type="button"
              aria-label={`View image ${index + 1}`}
              aria-current={index === activeIndex}
              onClick={() => setActiveIndex(index)}
              className={cn(
                "bg-surface-100 relative size-17 shrink-0 overflow-hidden rounded-2xl border-2 outline-none focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2",
                index === activeIndex ? "border-accent" : "border-transparent",
              )}
            >
              <Image src={image} alt="" fill className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}