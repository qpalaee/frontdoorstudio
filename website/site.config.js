// Contact details used across the site. Change them here only:
// Vite writes them into index.html (see vite.config.js), in dev and in the build.
export const SITE = {
  // Public address of the site, no trailing slash. PLACEHOLDER: replace with the
  // real domain before launch (used by canonical, Open Graph, sitemap, robots).
  url: 'https://frontdoorstudio.example',
  name: 'Frontdoor Studio',
  whatsappNumber: '+212 773235423',
  // Prefilled in the chat when someone taps a WhatsApp button.
  whatsappMessage: "Hi Frontdoor, I'd like a website for my business.",
  email: 'frontdoorstudio.la@gmail.com',
  instagram: '@frontdoor.la',
};

// Links derived from the values above.
export const SITE_LINKS = {
  // wa.me wants digits only; the message goes in ?text=
  whatsapp: `https://wa.me/${SITE.whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(SITE.whatsappMessage)}`,
  instagram: `https://instagram.com/${SITE.instagram.replace(/^@/, '')}`,
};
