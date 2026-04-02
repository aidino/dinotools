"use client";

interface SourceBannerProps {
  query?: string;
}

export function SourceBanner({ query }: SourceBannerProps) {
  if (!query) return null;

  return (
    <p className="text-sm text-gray-400 text-center mb-6">
      Tìm hiểu chuyên sâu về{" "}
      <a
        href="#"
        className="text-[#5ba4cf] underline underline-offset-2"
        onClick={(e) => e.preventDefault()}
      >
        {query}
      </a>
    </p>
  );
}
