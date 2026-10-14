export const palettes = [
  {
    id: "deep-current",
    name: "Deep Current",
    description: "Smoked browns and soft rose neutrals",
    category: "SaaS",
    mood: "Warm",
    style: "Dark",
    previewMode: "dark",
    keywords: ["neutral", "brown", "rose", "warm", "dark", "minimalist", "editorial", "dashboard"],
    colors: ["#2A0800", "#775144", "#C09891", "#BEA8A7", "#FAD8D8"],
  },
  {
    id: "citrus-hour",
    name: "Citrus Hour",
    description: "Golden hour, bottled",
    category: "E-commerce",
    mood: "Vibrant",
    style: "Vibrant",
    previewMode: "light",
    keywords: ["warm", "editorial", "golden", "sunset", "bright", "shop", "e-commerce"],
    colors: ["#202A24", "#58634A", "#A5A66A", "#E0B867", "#E98B55"],
  },
  {
    id: "soft-structure",
    name: "Soft Structure",
    description: "Less noise, more nuance",
    category: "Portfolio",
    mood: "Minimalist",
    style: "Minimalist",
    previewMode: "light",
    keywords: ["neutral", "minimal", "soft", "clean", "structure", "portfolio", "agency", "business"],
    colors: ["#282B2A", "#555956", "#858983", "#B5B5AA", "#DDD8CB"],
  },
  {
    id: "tidal-glass",
    name: "Tidal Glass",
    description: "Airy blues with a sea-glass glow",
    category: "Dashboard",
    mood: "Calm",
    style: "Pastel",
    previewMode: "light",
    keywords: ["coastal", "pastel", "ocean", "light", "dashboard", "saas"],
    colors: ["#E8F1EE", "#B9D6D0", "#83ADA9", "#4E7D80", "#274C50"],
  },
  {
    id: "clay-study",
    name: "Clay Study",
    description: "A warm canvas for creative work",
    category: "Portfolio",
    mood: "Warm",
    style: "Pastel",
    previewMode: "light",
    keywords: ["warm", "creative", "portfolio", "earthy", "editorial"],
    colors: ["#F5E9DB", "#E5C8AF", "#C98F70", "#8F5D4E", "#493B37"],
  },
  {
    id: "midnight-ledger",
    name: "Midnight Ledger",
    description: "A focused palette for serious data",
    category: "SaaS",
    mood: "Focused",
    style: "Dark",
    previewMode: "dark",
    keywords: ["fintech", "dark", "finance", "dashboard", "saas", "data", "premium", "business", "agency"],
    colors: ["#111827", "#1F2937", "#334155", "#38BDF8", "#A3E635"],
  },
  {
    id: "botanical-market",
    name: "Botanical Market",
    description: "Fresh greens and market-day warmth",
    category: "E-commerce",
    mood: "Natural",
    style: "Light",
    previewMode: "light",
    keywords: ["natural", "shop", "e-commerce", "botanical", "green", "fresh"],
    colors: ["#F4F1E6", "#DCE3C4", "#A2B18A", "#647A58", "#354B3C"],
  },
  {
    id: "electric-bloom",
    name: "Electric Bloom",
    description: "A little contrast, a lot of energy",
    category: "Portfolio",
    mood: "Bold",
    style: "Vibrant",
    previewMode: "dark",
    keywords: ["bold", "creative", "vibrant", "colorful", "portfolio", "neon", "gaming"],
    colors: ["#201A35", "#493C78", "#9171DB", "#F27EAF", "#F9C86B"],
  },
];

export const paletteCategories = ["SaaS", "Portfolio", "E-commerce", "Dashboard"];
export const paletteStyles = ["Dark", "Light", "Pastel", "Vibrant", "Minimalist"];

export function getPalette(id) {
  return palettes.find((palette) => palette.id === id) ?? null;
}

export function findPalette(prompt, previousId = "") {
  const words = prompt.toLowerCase().match(/[a-z]+/g) ?? [];
  const ranked = palettes.map((palette) => ({
    palette,
    score: palette.keywords.filter((keyword) => words.some((word) => word.length >= 3 && (word === keyword || word.startsWith(keyword) || keyword.startsWith(word)))).length,
  })).sort((first, second) => second.score - first.score);
  const bestScore = ranked[0]?.score ?? 0;
  const matches = ranked.filter((item) => item.score === bestScore && item.palette.id !== previousId);
  return (matches[0] ?? ranked.find((item) => item.palette.id !== previousId) ?? ranked[0]).palette;
}

export function colorValues(hex) {
  const value = hex.replace("#", "");
  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);
  const normalized = [red, green, blue].map((channel) => channel / 255);
  const maximum = Math.max(...normalized);
  const minimum = Math.min(...normalized);
  const difference = maximum - minimum;
  let hue = 0;
  let saturation = 0;
  const lightness = (maximum + minimum) / 2;

  if (difference !== 0) {
    saturation = difference / (1 - Math.abs(2 * lightness - 1));
    switch (maximum) {
      case normalized[0]: hue = ((normalized[1] - normalized[2]) / difference) % 6; break;
      case normalized[1]: hue = (normalized[2] - normalized[0]) / difference + 2; break;
      default: hue = (normalized[0] - normalized[1]) / difference + 4;
    }
    hue *= 60;
    if (hue < 0) hue += 360;
  }

  return {
    rgb: `rgb(${red}, ${green}, ${blue})`,
    hsl: `hsl(${Math.round(hue)}, ${Math.round(saturation * 100)}%, ${Math.round(lightness * 100)}%)`,
  };
}

export function paletteCss(palette) {
  return `:root {\n${palette.colors.map((color, index) => `  --color-${index + 1}: ${color};`).join("\n")}\n}`;
}

export function palettePreviewColors(palette, mode) {
  const sorted = [...palette.colors].sort((first, second) => {
    const luminance = (hex) => {
      const channels = hex.slice(1).match(/.{2}/g).map((channel) => Number.parseInt(channel, 16) / 255);
      const linear = channels.map((channel) => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4);
      return linear[0] * .2126 + linear[1] * .7152 + linear[2] * .0722;
    };
    return luminance(first) - luminance(second);
  });
  const [darkest, darkSurface, midpoint, lightSurface, lightest] = sorted;
  return mode === "dark"
    ? { background: darkest, surface: darkSurface, text: lightest, primary: midpoint, secondary: lightSurface, accent: midpoint }
    : { background: lightest, surface: lightSurface, text: darkest, primary: darkSurface, secondary: midpoint, accent: darkSurface };
}

export function downloadText(filename, text, type = "text/plain") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
