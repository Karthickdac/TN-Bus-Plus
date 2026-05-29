import { createContext, useContext, useState, ReactNode } from "react";

export type Lang = "en" | "ta";

const translations = {
  en: {
    notice: "Notice",
    searchTitle: "Search Buses",
    searchSub: "Find your perfect journey",
    from: "From",
    to: "To",
    dateOfJourney: "Date of Journey",
    departurePlaceholder: "Departure city",
    arrivalPlaceholder: "Arrival city",
    searchBuses: "Search Buses",
    bookingForWomen: "Booking for Women",
    ladiesOnly: "Ladies Only",
    checkPNR: "Check PNR Status",
    myTrips: "My Trips",
    heroTag: "Live Booking Open",
    heroTitle1: "Tamil Nadu's",
    heroHighlight: "#1 Official",
    heroTitle2: "Bus Booking Portal",
    heroSub: "Book government AC buses, track live location, and travel safely across Tamil Nadu.",
    badge1: "10+ Bus Types",
    badge2: "Govt. Certified",
    badge3: "87% On-time",
    badge4: "AC & WiFi",
    mostBooked: "Most Booked",
    popularRoutes: "Popular Routes",
    viewAll: "View all",
    bookNow: "Book now →",
    onwards: "onwards",
    certTitle: "Govt. Certified",
    certDesc: "All buses TNSTC approved",
    trackTitle: "Live Tracking",
    trackDesc: "Real-time GPS on every bus",
    ontimeTitle: "87% On-Time",
    ontimeDesc: "Industry-leading punctuality",
    wifiTitle: "AC & WiFi",
    wifiDesc: "Premium comfort guaranteed",
    routes: "Routes",
    pnrStatus: "PNR Status",
    dashboard: "Dashboard",
    admin: "Admin",
    tnstcName: "Tamil Nadu State Transport Corporation",
    tnstcSub: "TN Bus+ · Official Online Bus Booking System",
    govtName: "Government of Tamil Nadu",
    cmTitle: "Hon'ble Chief Minister",
    cmName: "Thiru. C. Joseph Vijay",
    cmState: "Tamil Nadu",
  },
  ta: {
    notice: "அறிவிப்பு",
    searchTitle: "பஸ் தேடுக",
    searchSub: "உங்கள் பயணத்தை திட்டமிடுங்கள்",
    from: "புறப்படும் இடம்",
    to: "செல்லும் இடம்",
    dateOfJourney: "பயண தேதி",
    departurePlaceholder: "புறப்படும் நகரம்",
    arrivalPlaceholder: "செல்லும் நகரம்",
    searchBuses: "பஸ் தேடுக",
    bookingForWomen: "பெண்களுக்கான பதிவு",
    ladiesOnly: "பெண்கள் மட்டும்",
    checkPNR: "PNR நிலை பார்க்க",
    myTrips: "என் பயணங்கள்",
    heroTag: "நேரடி பதிவு திறந்துள்ளது",
    heroTitle1: "தமிழ்நாட்டின்",
    heroHighlight: "#1 அதிகாரப்பூர்வ",
    heroTitle2: "பஸ் பதிவு தளம்",
    heroSub: "அரசு AC பஸ்களை பதிவு செய்யுங்கள், நேரடி இருப்பிடத்தை கண்காணியுங்கள், தமிழ்நாடு முழுவதும் பாதுகாப்பாக பயணியுங்கள்.",
    badge1: "10+ பஸ் வகைகள்",
    badge2: "அரசு சான்றளிக்கப்பட்டது",
    badge3: "87% சரியான நேரம்",
    badge4: "AC & WiFi",
    mostBooked: "அதிகம் பதிவு செய்யப்பட்டவை",
    popularRoutes: "பிரபலமான வழிகள்",
    viewAll: "அனைத்தும் பார்க்க",
    bookNow: "இப்போது பதிவு செய்க →",
    onwards: "முதல்",
    certTitle: "அரசு சான்றளிக்கப்பட்டது",
    certDesc: "அனைத்து பஸ்களும் TNSTC அங்கீகாரம் பெற்றவை",
    trackTitle: "நேரடி கண்காணிப்பு",
    trackDesc: "ஒவ்வொரு பஸ்ஸிலும் நேரடி GPS",
    ontimeTitle: "87% சரியான நேரம்",
    ontimeDesc: "தொழிலில் முன்னணி நேரமேலாண்மை",
    wifiTitle: "AC & WiFi",
    wifiDesc: "சிறந்த வசதி உறுதி",
    routes: "பஸ் வழிகள்",
    pnrStatus: "PNR நிலை",
    dashboard: "பயணக் கணக்கு",
    admin: "நிர்வாகம்",
    tnstcName: "தமிழ்நாடு மாநில போக்குவரத்து கழகம்",
    tnstcSub: "TN Bus+ · அதிகாரப்பூர்வ ஆன்லைன் பஸ் பதிவு அமைப்பு",
    govtName: "தமிழ்நாடு அரசு",
    cmTitle: "மாண்புமிகு முதலமைச்சர்",
    cmName: "திரு. C. ஜோசப் விஜய்",
    cmState: "தமிழ்நாடு",
  },
} as const;

type Translations = typeof translations.en;

interface LanguageContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: "en",
  setLang: () => {},
  t: translations.en,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("en");
  return (
    <LanguageContext.Provider value={{ lang, setLang, t: translations[lang] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  return useContext(LanguageContext);
}
