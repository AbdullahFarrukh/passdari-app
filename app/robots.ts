import type { MetadataRoute } from "next";
import { siteUrl } from "./sitemap";

// The public pages are the home page and the shop directory. The signed-in areas and the API are not
// useful to a search engine (they render nothing without an account), so they are left out.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/customer", "/merchant"] }],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
