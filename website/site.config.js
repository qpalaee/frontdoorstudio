// Contact details used across the site. Change them here only:
// Vite writes them into index.html (see vite.config.js), in dev and in the build.
export const SITE = {
  whatsappNumber: '+212 773235423',
  email: 'frontdoorstudio.la@gmail.com',
  instagram: '@frontdoor.la',
};

// Links derived from the values above.
export const SITE_LINKS = {
  whatsapp: `https://wa.me/${SITE.whatsappNumber.replace(/\D/g, '')}`, // wa.me wants digits only
  instagram: `https://instagram.com/${SITE.instagram.replace(/^@/, '')}`,
};
