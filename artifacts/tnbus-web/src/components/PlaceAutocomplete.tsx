import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface PlaceAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  inputClassName?: string;
  /** Tailwind text-color class for the leading pin icon. */
  iconClassName?: string;
  ariaLabel?: string;
}

// A custom place picker. We deliberately do NOT use a native <datalist> because
// mobile browsers render it inconsistently (often not at all), which is why
// suggestions never appeared on phones. This renders our own dropdown so the
// same suggestions show on every device.
export function PlaceAutocomplete({
  value,
  onChange,
  options,
  placeholder,
  inputClassName,
  iconClassName = "text-muted-foreground",
  ariaLabel,
}: PlaceAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const matches = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return options.slice(0, 8);
    const starts: string[] = [];
    const contains: string[] = [];
    for (const o of options) {
      const lo = o.toLowerCase();
      if (lo.startsWith(q)) starts.push(o);
      else if (lo.includes(q)) contains.push(o);
    }
    return [...starts, ...contains].slice(0, 8);
  }, [value, options]);

  useEffect(() => {
    const onDocPointer = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onDocPointer);
    return () => document.removeEventListener("pointerdown", onDocPointer);
  }, []);

  const select = (place: string) => {
    onChange(place);
    setOpen(false);
  };

  const showList = open && matches.length > 0;

  return (
    <div className="relative" ref={wrapRef}>
      <MapPin className={cn("absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 z-10", iconClassName)} />
      <Input
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className={inputClassName}
        aria-label={ariaLabel}
        autoComplete="off"
        role="combobox"
        aria-expanded={showList}
      />
      {showList && (
        <ul
          className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-auto rounded-xl border border-border bg-popover text-popover-foreground shadow-lg py-1"
          role="listbox"
        >
          {matches.map(place => (
            <li key={place}>
              <button
                type="button"
                // onPointerDown fires before the input blur, so the selection
                // is not lost when the dropdown closes on outside-pointer.
                onPointerDown={e => { e.preventDefault(); select(place); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
              >
                <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="truncate">{place}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
