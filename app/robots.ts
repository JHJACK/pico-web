import type { MetadataRoute } from "next";

const BASE_URL = "https://pico-web-one.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/quiz", "/ranking", "/learn"],
        disallow: ["/api/", "/mypage/", "/_next/"],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
