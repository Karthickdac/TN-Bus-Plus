import { Link } from "wouter";
import { Construction, ArrowLeft, type LucideIcon } from "lucide-react";

export default function ComingSoon({
  title,
  description,
  icon: Icon = Construction,
}: {
  title: string;
  description: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl">
      <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center shadow-sm">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-5">
          <Icon className="w-8 h-8" />
        </div>
        <span className="inline-block text-[10px] font-bold uppercase tracking-widest text-amber-700 bg-amber-100 px-2 py-0.5 rounded mb-3">
          Coming soon
        </span>
        <h1 className="text-2xl font-extrabold text-slate-900">{title}</h1>
        <p className="text-slate-500 mt-2 max-w-md mx-auto">{description}</p>
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 mt-6 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
