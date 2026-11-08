// Sputnik Delivery Ltd: the driver sign-up page and the group posting planner.
// Everything Gasan may want to change lives here. The offer matches Jasmin's daily 'drivers' post.

export const SPUTNIK = {
  company: "Sputnik Delivery Ltd",
  // Sputnik Delivery Ltd on Facebook.
  groupUrl: "https://www.facebook.com/profile.php?id=100063960219070",
  // WhatsApp, international format without "+" or spaces (07907 888749).
  whatsapp: "447907888749",
  areas: ["NW1", "W2", "Central London"],
  headline: "Same patch. Every day.",
  intro:
    "Regular multi-drop routes in NW1 and W2, Central London. 150 to 200 parcels a day at £1 each, six days a week. The route doesn't move: learn it once, run it well, and it keeps paying.",
  offer: [
    { title: "£1 per parcel", text: "150 to 200 parcels a day for the right driver." },
    { title: "Fixed routes", text: "NW1 and W2, Central London. Same streets, week after week." },
    { title: "Six days a week", text: "Consistent, local, ongoing work. No thin days without explanation." },
    { title: "No depot politics", text: "No being shuffled around to cover gaps that aren't yours to fill." },
  ],
  requirements: [
    "2 to 3+ years of multi-drop experience (DPD, Amazon, Yodel, DHL or similar)",
    "Your own van",
    "Van insurance",
    "Goods in Transit (GIT) insurance",
    "Full UK driving licence",
    "Right to work in the UK",
    "Proof of address",
  ],
} as const;

/** Rules that keep Gasan's account safe in other people's groups. */
export const POSTING = {
  maxPerDay: 10, // groups to post in per day, at most
  defaultEveryDays: 7, // wait this long before posting in the same group again
  minGapMinutes: 4, // suggested pause between two posts
};

/** Searches that open in Facebook, to find groups worth joining. Gasan joins by hand. */
export const GROUP_SEARCHES = [
  "courier drivers London",
  "multi drop drivers UK",
  "self employed van drivers London",
  "delivery driver jobs London",
  "parcel delivery drivers UK",
  "Amazon Flex drivers London",
  "Central London courier drivers",
  "DPD Evri Yodel drivers",
  "owner driver courier UK",
  "van drivers Essex",
  "courier jobs Kent",
];

export const searchUrl = (q: string) => `https://www.facebook.com/search/groups/?q=${encodeURIComponent(q)}`;

/** Starter ads. {link} becomes the group's own tracking link to the sign-up page. */
export const STARTER_ADS = [
  {
    title: "Short and direct",
    body: "🚐 Experienced multi-drop driver wanted: NW1 & W2, Central London\n\n💷 £1 per parcel\n📦 150 to 200 parcels a day\n📅 6 days a week, fixed routes\n\nOwn van, van insurance and GIT needed. 2 to 3+ years with DPD, Amazon, Yodel, DHL or similar.\n\nApply in 1 minute 👉 {link}",
  },
  {
    title: "Same patch",
    body: "Tired of different postcodes every week and rates that change without warning? 🤔\n\nSputnik Delivery Ltd has a fixed route in NW1 & W2, Central London. 150 to 200 parcels a day at £1 each, six days a week. Learn it once, run it well.\n\nExperienced drivers with their own van only. Apply here: {link}",
  },
  {
    title: "One position open",
    body: "📦 One position open: Central London (NW1 & W2)\n\nRegular multi-drop route, £1 per parcel, 150 to 200 a day, 6 days a week.\n\nYou'll need: own van, van insurance, Goods in Transit cover, UK licence, right to work and 2 to 3+ years of multi-drop experience.\n\nDetails and sign-up 👉 {link}",
  },
  {
    title: "Community angle",
    body: "Hi all 👋 Gasan here from Sputnik Delivery Ltd.\n\nWe're looking for an experienced multi-drop driver with their own van for a regular route in NW1 & W2, Central London. £1 per parcel, 150 to 200 a day, six days a week.\n\nIf that's you, or someone you know, apply here: {link}\n\nHappy to answer questions in the comments.",
  },
];
