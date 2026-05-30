// Static catalogue of curated Tamil Nadu tourism packages, delivered on the
// state bus network. Curated content, so it lives here like the offers/pass
// catalogues. Represented in-app only — no real third-party partner booking.

export interface TourismItineraryStop {
  day: number;
  title: string;
  detail: string;
}

export interface TourismPackageDef {
  id: string;
  name: string;
  destination: string;
  region: string;
  durationDays: number;
  nights: number;
  price: number;
  heroEmoji: string;
  summary: string;
  highlights: string[];
  inclusions: string[];
  itinerary: TourismItineraryStop[];
}

export const TOURISM_PACKAGES: TourismPackageDef[] = [
  {
    id: "ooty-hills",
    name: "Ooty Hill Station Getaway",
    destination: "Ooty (Udhagamandalam)",
    region: "The Nilgiris",
    durationDays: 3,
    nights: 2,
    price: 6499,
    heroEmoji: "🏔️",
    summary: "Misty tea gardens, the Nilgiri toy train and cool mountain air in the Queen of Hill Stations.",
    highlights: ["Nilgiri Mountain toy train", "Botanical Gardens", "Doddabetta Peak viewpoint", "Tea estate tour"],
    inclusions: ["AC sleeper bus both ways", "2 nights stay", "Daily breakfast", "Guided sightseeing"],
    itinerary: [
      { day: 1, title: "Arrive in Ooty", detail: "Overnight bus from Chennai, check-in and an easy lake walk." },
      { day: 2, title: "Hills & gardens", detail: "Toy train ride, Botanical Gardens and Doddabetta Peak." },
      { day: 3, title: "Tea trail & return", detail: "Tea estate visit and factory tour before the evening bus home." },
    ],
  },
  {
    id: "kodaikanal-lake",
    name: "Kodaikanal Lake Retreat",
    destination: "Kodaikanal",
    region: "Dindigul hills",
    durationDays: 3,
    nights: 2,
    price: 5999,
    heroEmoji: "🚣",
    summary: "Boating on the star-shaped lake, pine forests and pillar rocks in the Princess of Hill Stations.",
    highlights: ["Kodai Lake boating", "Pillar Rocks", "Coaker's Walk", "Pine Forest"],
    inclusions: ["AC sleeper bus both ways", "2 nights stay", "Daily breakfast", "Lake boating pass"],
    itinerary: [
      { day: 1, title: "Arrive in Kodai", detail: "Check-in and a sunset stroll along Coaker's Walk." },
      { day: 2, title: "Lake & viewpoints", detail: "Boating, Pillar Rocks and the Pine Forest." },
      { day: 3, title: "Bryant Park & return", detail: "Morning at Bryant Park before the journey home." },
    ],
  },
  {
    id: "rameswaram-pilgrimage",
    name: "Rameswaram Temple Pilgrimage",
    destination: "Rameswaram",
    region: "Ramanathapuram coast",
    durationDays: 2,
    nights: 1,
    price: 4299,
    heroEmoji: "🛕",
    summary: "A guided pilgrimage to the sacred Ramanathaswamy Temple and the legendary Dhanushkodi shore.",
    highlights: ["Ramanathaswamy Temple", "22 holy theerthams", "Dhanushkodi ghost town", "Pamban bridge views"],
    inclusions: ["AC bus both ways", "1 night stay", "Temple darshan assistance", "Dhanushkodi jeep ride"],
    itinerary: [
      { day: 1, title: "Temple darshan", detail: "Arrive, take the sacred baths and Ramanathaswamy darshan." },
      { day: 2, title: "Dhanushkodi & return", detail: "Dhanushkodi point and Pamban bridge before the bus home." },
    ],
  },
  {
    id: "kanyakumari-sunrise",
    name: "Kanyakumari Sunrise Tour",
    destination: "Kanyakumari",
    region: "Land's End",
    durationDays: 2,
    nights: 1,
    price: 4799,
    heroEmoji: "🌅",
    summary: "Watch the sun rise where three seas meet, with the Vivekananda Rock and Thiruvalluvar statue.",
    highlights: ["Triveni Sangam sunrise", "Vivekananda Rock Memorial", "Thiruvalluvar Statue", "Sunset point"],
    inclusions: ["AC sleeper bus both ways", "1 night stay", "Daily breakfast", "Ferry tickets"],
    itinerary: [
      { day: 1, title: "Arrive & sunset", detail: "Check-in, ferry to Vivekananda Rock and the famous sunset." },
      { day: 2, title: "Sunrise & return", detail: "Early sunrise at the Sangam before the journey home." },
    ],
  },
  {
    id: "madurai-heritage",
    name: "Madurai Heritage Trail",
    destination: "Madurai",
    region: "Temple city",
    durationDays: 2,
    nights: 1,
    price: 3899,
    heroEmoji: "🏛️",
    summary: "The towering Meenakshi Amman Temple, Thirumalai Nayakkar palace and Madurai's famous street food.",
    highlights: ["Meenakshi Amman Temple", "Thirumalai Nayakkar Mahal", "Gandhi Memorial Museum", "Night food walk"],
    inclusions: ["AC bus both ways", "1 night stay", "Daily breakfast", "Guided heritage walk"],
    itinerary: [
      { day: 1, title: "Temple & palace", detail: "Meenakshi Temple darshan and the Nayakkar palace light show." },
      { day: 2, title: "Museum & flavours", detail: "Gandhi Museum and a famous Madurai food walk before return." },
    ],
  },
];

export function findTourismPackage(id: string): TourismPackageDef | null {
  return TOURISM_PACKAGES.find((p) => p.id === id) ?? null;
}
