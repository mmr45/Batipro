import { forwardRef, type ComponentProps, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, Info, Loader2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const variants: Record<Variant, string> = {
  primary: "bg-bleu text-white hover:bg-bleu-fonce shadow-[inset_0_-2px_0_rgba(0,0,0,0.18)]",
  secondary: "bg-papier text-ardoise border border-ardoise/20 hover:border-ardoise/50",
  ghost: "text-bleu hover:bg-bleu-pale",
  danger: "bg-rouge text-white hover:brightness-110",
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-sm px-4 py-2.5 text-[15px] font-semibold transition-colors disabled:opacity-55 disabled:cursor-not-allowed";

export function Button({
  variant = "primary",
  loading,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }) {
  return (
    <button className={cn(base, variants[variant], className)} disabled={loading || props.disabled} {...props}>
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function btn(variant: Variant = "primary", className?: string) {
  return cn(base, variants[variant], className);
}

export function ButtonLink({ variant = "primary", className, ...props }: ComponentProps<typeof Link> & { variant?: Variant; className?: string }) {
  return <Link className={cn(base, variants[variant], className)} {...props} />;
}

export function Container({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("mx-auto w-full max-w-6xl px-4 sm:px-6", className)}>{children}</div>;
}

export function PageHeader({ title, intro, children }: { title: string; intro?: ReactNode; children?: ReactNode }) {
  return (
    <div className="border-b border-ardoise/10 bg-papier">
      <Container className="py-10 sm:py-14">
        <h1 className="display text-5xl sm:text-6xl">{title}</h1>
        {intro && <div className="mt-4 max-w-2xl text-lg text-ardoise-2">{intro}</div>}
        {children}
      </Container>
    </div>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("print-card rounded-md bg-papier p-5 sm:p-6 ring-1 ring-ardoise/10", className)}>{children}</div>;
}

const tones = {
  info: { cls: "bg-bleu-pale text-bleu-fonce", Icon: Info },
  warn: { cls: "bg-balise-pale text-[#8a3d06]", Icon: AlertTriangle },
  ok: { cls: "bg-vert-pale text-vert", Icon: CheckCircle2 },
  error: { cls: "bg-rouge-pale text-rouge", Icon: XCircle },
} as const;

export function Notice({ tone = "info", title, children, className }: { tone?: keyof typeof tones; title?: string; children?: ReactNode; className?: string }) {
  const { cls, Icon } = tones[tone];
  return (
    <div className={cn("flex gap-3 rounded-sm px-4 py-3 text-[14.5px]", cls, className)} role={tone === "error" ? "alert" : undefined}>
      <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
      <div className="min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn(title && "mt-0.5", "text-ardoise-2 [&_strong]:text-ardoise")}>{children}</div>}
      </div>
    </div>
  );
}

/** Référence légale (article de code, texte). */
export function Ref({ children }: { children: ReactNode }) {
  return <span className="ref">{children}</span>;
}

// ---------------- Formulaires ----------------

export function Field({ label, hint, error, htmlFor, children, className }: { label: string; hint?: ReactNode; error?: string; htmlFor?: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-[14px] font-semibold text-ardoise">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-[13px] text-ardoise-3">{hint}</p>}
      {error && <p className="text-[13px] font-medium text-rouge">{error}</p>}
    </div>
  );
}

const inputCls =
  "w-full rounded-sm border border-ardoise/20 bg-papier px-3 py-2.5 text-[15px] text-ardoise placeholder:text-ardoise-3 focus:border-bleu focus:outline-none focus:ring-2 focus:ring-bleu/25 aria-[invalid=true]:border-rouge";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...p }, ref) {
  return <input ref={ref} className={cn(inputCls, className)} {...p} />;
});

export function Select({ className, children, ...p }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(inputCls, "appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%234a525d%22 stroke-width=%222.5%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[right_0.75rem_center] bg-no-repeat pr-9", className)} {...p}>
      {children}
    </select>
  );
}

export function Textarea({ className, ...p }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(inputCls, "min-h-24", className)} {...p} />;
}

export function Checkbox({ label, hint, checked, onChange, id }: { label: ReactNode; hint?: ReactNode; checked: boolean; onChange: (v: boolean) => void; id: string }) {
  return (
    <label htmlFor={id} className="flex cursor-pointer gap-3 rounded-sm py-1">
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-bleu" />
      <span className="text-[14.5px]">
        <span className="text-ardoise">{label}</span>
        {hint && <span className="mt-0.5 block text-[13px] text-ardoise-3">{hint}</span>}
      </span>
    </label>
  );
}

export function Choices<T extends string>({
  name,
  value,
  onChange,
  options,
  columns = 2,
}: {
  name: string;
  value: T | "";
  onChange: (v: T) => void;
  options: { value: T; label: string; sub?: string }[];
  columns?: 1 | 2 | 3 | 4;
}) {
  const grid = { 1: "", 2: "sm:grid-cols-2", 3: "sm:grid-cols-3", 4: "sm:grid-cols-2 lg:grid-cols-4" }[columns];
  return (
    <div role="radiogroup" className={cn("grid gap-2", grid)}>
      {options.map((o) => {
        const active = value === o.value;
        return (
          <label
            key={o.value}
            className={cn(
              "flex cursor-pointer flex-col rounded-sm border bg-papier px-3.5 py-3 transition-colors",
              active ? "border-bleu bg-bleu-pale ring-1 ring-bleu" : "border-ardoise/15 hover:border-ardoise/40",
            )}
          >
            <input type="radio" name={name} value={o.value} checked={active} onChange={() => onChange(o.value)} className="sr-only" />
            <span className="text-[14.5px] font-semibold">{o.label}</span>
            {o.sub && <span className="mt-0.5 text-[13px] text-ardoise-2">{o.sub}</span>}
          </label>
        );
      })}
    </div>
  );
}

export function Spinner({ label = "Chargement" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 py-10 text-ardoise-2" role="status">
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> {label}…
    </div>
  );
}

export function StepTitle({ n, total, children }: { n: number; total: number; children: ReactNode }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="display text-3xl text-bleu">
        {n}/{total}
      </span>
      <h2 className="display text-3xl">{children}</h2>
    </div>
  );
}
