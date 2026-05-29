import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useAssistantChat } from "@workspace/api-client-react";
import type { SearchResult } from "@workspace/api-client-react";
import { useLang } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Send,
  Mic,
  Bus,
  Clock,
  Users,
  ArrowRight,
  Loader2,
  IndianRupee,
} from "lucide-react";

type ChatMsg = { role: "user" | "assistant"; content: string; trips?: SearchResult[] };

const COPY = {
  en: {
    title: "AI Travel Assistant",
    subtitle: "Ask in Tamil or English — I'll find your bus",
    empty: "Hi! Where would you like to travel today?",
    placeholder: "Type or speak your travel plan…",
    book: "View & Book",
    seatsLeft: "seats left",
    listening: "Listening…",
    suggestions: [
      "Cheapest bus from Chennai to Madurai",
      "Night AC sleeper to Coimbatore",
      "Women-friendly bus to Trichy tomorrow",
    ],
  },
  ta: {
    title: "AI பயண உதவியாளர்",
    subtitle: "தமிழ் அல்லது ஆங்கிலத்தில் கேளுங்கள் — நான் பஸ் தேடுகிறேன்",
    empty: "வணக்கம்! இன்று எங்கு பயணிக்க விரும்புகிறீர்கள்?",
    placeholder: "உங்கள் பயணத்தை தட்டச்சு செய்யுங்கள் அல்லது பேசுங்கள்…",
    book: "பார்த்து பதிவு செய்க",
    seatsLeft: "இடங்கள்",
    listening: "கேட்கிறேன்…",
    suggestions: [
      "சென்னையிலிருந்து மதுரைக்கு மலிவான பஸ்",
      "கோயம்புத்தூருக்கு இரவு AC ஸ்லீப்பர்",
      "நாளை திருச்சிக்கு பெண்களுக்கு ஏற்ற பஸ்",
    ],
  },
} as const;

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? iso
    : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function TripCard({ trip, label }: { trip: SearchResult; label: string }) {
  const [, setLocation] = useLocation();
  return (
    <button
      onClick={() => setLocation(`/bus/${trip.busId}?scheduleId=${trip.scheduleId}`)}
      className="w-full text-left bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-md shadow-sm transition-all p-4 group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Bus className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm text-slate-900 truncate">{trip.busType}</p>
            <p className="text-xs text-slate-500 truncate">
              {trip.origin} → {trip.destination}
            </p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="font-extrabold text-base text-slate-900 flex items-center justify-end">
            <IndianRupee className="w-3.5 h-3.5" />
            {trip.fare}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          {fmtTime(trip.departureTime)} – {fmtTime(trip.arrivalTime)}
        </span>
        <span className="inline-flex items-center gap-1">
          <Users className="w-3.5 h-3.5 text-slate-400" />
          {trip.availableSeats} {label}
        </span>
      </div>

      {trip.amenities && trip.amenities.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {trip.amenities.slice(0, 4).map(a => (
            <span
              key={a}
              className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600"
            >
              {a}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}

export default function Assistant() {
  const { lang } = useLang();
  const c = COPY[lang];
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const chat = useAssistantChat();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, chat.isPending]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || chat.isPending) return;
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      setMessages(prev => [...prev, { role: "user", content: trimmed }]);
      setInput("");
      try {
        const res = await chat.mutateAsync({ data: { message: trimmed, lang, history } });
        setMessages(prev => [
          ...prev,
          { role: "assistant", content: res.reply, trips: res.trips ?? [] },
        ]);
      } catch {
        setMessages(prev => [
          ...prev,
          {
            role: "assistant",
            content:
              lang === "ta"
                ? "மன்னிக்கவும், ஏதோ தவறு நடந்தது. மீண்டும் முயற்சிக்கவும்."
                : "Sorry, something went wrong. Please try again.",
          },
        ]);
      }
    },
    [messages, chat, lang],
  );

  const toggleMic = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const recognition = new SR();
    recognition.lang = lang === "ta" ? "ta-IN" : "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (e: any) => {
      const transcript = e.results?.[0]?.[0]?.transcript ?? "";
      if (transcript) setInput(transcript);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  }, [listening, lang]);

  const voiceSupported =
    typeof window !== "undefined" &&
    ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] bg-gradient-to-b from-indigo-50/60 to-white">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-200 shrink-0">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="font-extrabold text-base sm:text-lg text-slate-900 leading-tight truncate">
              {c.title}
            </h1>
            <p className="text-xs text-slate-500 truncate">{c.subtitle}</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-5 max-w-2xl space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-10">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-200 mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <p className="text-slate-700 font-semibold mb-5">{c.empty}</p>
              <div className="flex flex-col items-center gap-2">
                {c.suggestions.map(s => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="text-sm text-left w-full max-w-md px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div className={m.role === "user" ? "max-w-[85%]" : "max-w-[92%] w-full"}>
                <div
                  className={
                    m.role === "user"
                      ? "bg-indigo-600 text-white rounded-2xl rounded-br-md px-4 py-2.5 text-sm shadow-sm"
                      : "bg-white text-slate-800 rounded-2xl rounded-bl-md px-4 py-2.5 text-sm shadow-sm border border-slate-200 whitespace-pre-wrap"
                  }
                >
                  {m.content}
                </div>
                {m.trips && m.trips.length > 0 && (
                  <div className="mt-3 space-y-2.5">
                    {m.trips.map(t => (
                      <TripCard key={t.scheduleId} trip={t} label={c.seatsLeft} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {chat.isPending && (
            <div className="flex justify-start">
              <div className="bg-white rounded-2xl rounded-bl-md px-4 py-3 shadow-sm border border-slate-200 flex items-center gap-2 text-slate-500 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" />
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce"
                    style={{ animationDelay: "0.15s" }}
                  />
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce"
                    style={{ animationDelay: "0.3s" }}
                  />
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Composer */}
      <div className="border-t border-slate-200 bg-white">
        <div className="container mx-auto px-4 py-3 max-w-2xl">
          <form
            onSubmit={e => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-end gap-2"
          >
            {voiceSupported && (
              <button
                type="button"
                onClick={toggleMic}
                aria-label="Voice input"
                className={`h-11 w-11 shrink-0 rounded-xl flex items-center justify-center transition-colors ${
                  listening
                    ? "bg-red-500 text-white animate-pulse"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <Mic className="w-5 h-5" />
              </button>
            )}
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={listening ? c.listening : c.placeholder}
              className="flex-1 h-11 rounded-xl border border-slate-300 px-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
            />
            <Button
              type="submit"
              disabled={!input.trim() || chat.isPending}
              className="h-11 w-11 shrink-0 p-0 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50"
              aria-label="Send"
            >
              {chat.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
