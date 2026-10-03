import { describe, expect, it } from "vitest";
import { isSafePublicHttpsUrl, normalizeSearchResults } from "./image-search";

describe("reference image boundary", () => {
  it("rejects local, private and non-https URLs", () => {
    expect(isSafePublicHttpsUrl("http://example.com/image.jpg")).toBe(false);
    expect(isSafePublicHttpsUrl("https://127.0.0.1/image.jpg")).toBe(false);
    expect(isSafePublicHttpsUrl("https://192.168.1.5/image.jpg")).toBe(false);
    expect(isSafePublicHttpsUrl("https://localhost/image.jpg")).toBe(false);
    expect(isSafePublicHttpsUrl("https://[::ffff:127.0.0.1]/image.jpg")).toBe(false);
    expect(isSafePublicHttpsUrl("https://example.com/image.jpg")).toBe(true);
  });

  it("normalizes only safe candidates without trusting arbitrary fields", () => {
    expect(normalizeSearchResults([
      { title: " 山景 ", url: "https://images.example.com/mountain.jpg" },
      { title: "内部", url: "https://10.0.0.1/private.jpg" },
      { title: "网页", url: "javascript:alert(1)" },
    ], 2)).toEqual([{
      title: "山景",
      imageUrl: "https://images.example.com/mountain.jpg",
      sourceUrl: "https://images.example.com/mountain.jpg",
      sourceDomain: "images.example.com",
    }]);
  });
});
