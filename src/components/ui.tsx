import {
  forwardRef,
  type ButtonHTMLAttributes,
  type ComponentProps,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, Check, CheckCircle2, Info, Loader2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { REGLES_VERSION } from "@rules/reglementation.ts";

// ---------------------------------------------------------------------
// Boutons
// ---------------------------------------------------------------------
type Variant = "primary" | "secondary" | "ghost" | "danger" | "encre" | "inverse";

const variants: Record<Variant, string> = {
  primary: "bg-bleu text-white hover:bg-bleu-fonce active:translate-y-px",
  encre: "bg-encre text-white hover:bg-bleu-nuit active:translate-y-px",
  secondary: "bg-papier text-encre ring-1 ring-inset ring-encre/25 hover:ring-encre active:translate-y-px",
  ghost: "text-bleu hover:bg-bleu-pale",
  danger: "bg-rouge text-white hover:brightness-110",
  inverse: "bg-white text-encre hover:bg-enduit active:translate-y-px",
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-sm px-4 py-2.5 text-[15.5px] font-semibold leading-tight transition-[background-color,box-shadow,color] duration-150 disabled:opacity-50 disabled:cursor-not-allowed";

export function btn(variant: Variant = "primary", className?: string) {
  return cn(base, variants[variant], className);
}

export function Button({
  variant = "primary",
  loading,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }) {
  return (
    <button className={btn(variant, className)} disabled={loading || props.disabled} aria-busy={loading || undefined} {...props}>
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function ButtonLink({ variant = "primary", className, ...props }: ComponentProps<typeof Link> & { variant?: Variant; className?: string }) {
  return <Link className={btn(variant, className)} {...props} />;
}

// ---------------------------------------------------------------------
// Mise en page
// ---------------------------------------------------------------------
export function Container({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("mx-auto w-full max-w-[78rem] px-4 sm:px-8", className)}>{children}</div>;
}

/**
 * Cote de dimension : trait fin avec deux butées et une valeur au centre,
 * comme sur un plan. `trace` la dessine une fois au chargement.
 */
export function Cote({ label, className, trace = false, tone = "balise" }: { label: string; className?: string; trace?: boolean; tone?: "balise" | "encre" | "clair" }) {
  const color = { balise: "text-balise", encre: "text-encre-3", clair: "text-white/60" }[tone];
  return (
    <div className={cn("relative flex items-center", color, className)} aria-hidden>
      <svg className="h-4 w-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 1000 16">
        <line x1="0" y1="1" x2="0" y2="15" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        <line x1="1000" y1="1" x2="1000" y2="15" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        <line
          x1="0"
          y1="8"
          x2="1000"
          y2="8"
          stroke="currentColor"
          strokeWidth="1.25"
          vectorEffect="non-scaling-stroke"
          className={trace ? "cote-trace" : undefined}
          style={{ ["--len" as string]: 1000 }}
        />
      </svg>
      <span className={cn("ref absolute left-1/2 -translate-x-1/2 whitespace-nowrap px-2 !text-[12px] font-medium", trace && "cote-label")} style={{ color: "currentColor", background: "var(--cote-bg, var(--color-papier))" }}>
        {label}
      </span>
    </div>
  );
}

/** Petit cartouche de plan : une rangée de cases libellé / valeur. */
export function Cartouche({ cells, className, dark }: { cells: [string, ReactNode][]; className?: string; dark?: boolean }) {
  return (
    <dl
      className={cn(
        "grid auto-cols-fr grid-flow-col text-[12.5px] leading-tight",
        dark ? "divide-x divide-white/15 border border-white/15 text-white" : "divide-x divide-encre/15 border border-encre/15 bg-papier",
        className,
      )}
    >
      {cells.map(([k, v]) => (
        <div key={k} className="min-w-0 px-2.5 py-1.5">
          <dt className={dark ? "text-white/50" : "text-encre-3"}>{k}</dt>
          <dd className="font-semibold">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function revision() {
  const [y, m, d] = REGLES_VERSION.split("-");
  return `${d}.${m}.${y}`;
}

/** En-tête de page façon « planche » d'un dossier technique. */
export function PageHeader({
  title,
  intro,
  children,
  planche,
  rubrique,
}: {
  title: string;
  intro?: ReactNode;
  children?: ReactNode;
  planche?: string;
  rubrique?: string;
}) {
  return (
    <div className="border-b border-encre/10 bg-papier">
      <Container className="grid gap-8 pb-10 pt-12 sm:pb-12 sm:pt-16 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="max-w-3xl">
          <h1 className="display text-[42px] sm:text-[62px]">{title}</h1>
          {intro && <div className="mt-5 max-w-2xl text-[18px] leading-relaxed text-encre-2">{intro}</div>}
          {children}
        </div>
        {(planche || rubrique) && (
          <Cartouche
            className="no-print w-full max-w-sm lg:w-80"
            cells={[
              ["Planche", planche ?? "—"],
              ["Rubrique", rubrique ?? "—"],
              ["Révision", revision()],
            ]}
          />
        )}
      </Container>
    </div>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("print-card feuille p-5 sm:p-7", className)}>{children}</div>;
}

/** Titre de section, avec numéro seulement quand le contenu est une vraie suite. */
export function SectionTitle({ children, num, className }: { children: ReactNode; num?: string; className?: string }) {
  return (
    <h2 className={cn("display flex items-baseline gap-3 text-[28px] sm:text-[34px]", className)}>
      {num && <span className="ref !text-[13px] !text-balise">{num}</span>}
      {children}
    </h2>
  );
}

// ---------------------------------------------------------------------
// Annotations
// ---------------------------------------------------------------------
const tones = {
  info: { cls: "border-bleu bg-bleu-pale/70", icon: "text-bleu", Icon: Info },
  warn: { cls: "border-balise bg-balise-pale", icon: "text-balise-fonce", Icon: AlertTriangle },
  ok: { cls: "border-vert bg-vert-pale", icon: "text-vert", Icon: CheckCircle2 },
  error: { cls: "border-rouge bg-rouge-pale", icon: "text-rouge", Icon: XCircle },
} as const;

export function Notice({ tone = "info", title, children, className }: { tone?: keyof typeof tones; title?: string; children?: ReactNode; className?: string }) {
  const { cls, icon, Icon } = tones[tone];
  return (
    <div className={cn("flex gap-3 border-l-[3px] px-4 py-3 text-[15px]", cls, className)} role={tone === "error" ? "alert" : undefined}>
      <Icon className={cn("mt-0.5 h-[18px] w-[18px] shrink-0", icon)} aria-hidden />
      <div className="min-w-0">
        {title && <p className="font-semibold text-encre">{title}</p>}
        {children && <div className={cn(title && "mt-0.5", "text-encre-2 [&_strong]:text-encre")}>{children}</div>}
      </div>
    </div>
  );
}

/** Référence légale (article de code, texte). */
export function Ref({ children }: { children: ReactNode }) {
  return <span className="ref">{children}</span>;
}

// ---------------------------------------------------------------------
// Formulaires
// ---------------------------------------------------------------------
export function Field({ label, hint, error, htmlFor, children, className }: { label: string; hint?: ReactNode; error?: string; htmlFor?: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-[14.5px] font-semibold text-encre">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-[13.5px] leading-snug text-encre-3">{hint}</p>}
      {error && <p className="text-[13.5px] font-medium text-rouge">{error}</p>}
    </div>
  );
}

const inputCls =
  "w-full rounded-sm border border-trait-fort bg-papier px-3 py-2.5 text-[16px] text-encre placeholder:text-encre-3/80 transition-colors hover:border-encre-3 focus:border-bleu focus:outline-none focus:ring-[3px] focus:ring-bleu/20 disabled:bg-enduit disabled:text-encre-3 aria-[invalid=true]:border-rouge";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...p }, ref) {
  return <input ref={ref} className={cn(inputCls, className)} {...p} />;
});

export function Select({ className, children, ...p }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        inputCls,
        "appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23151a21%22 stroke-width=%222.5%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[right_0.8rem_center] bg-no-repeat pr-9",
        className,
      )}
      {...p}
    >
      {children}
    </select>
  );
}

export function Textarea({ className, ...p }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(inputCls, "min-h-24 leading-snug", className)} {...p} />;
}

export function Checkbox({ label, hint, checked, onChange, id }: { label: ReactNode; hint?: ReactNode; checked: boolean; onChange: (v: boolean) => void; id: string }) {
  return (
    <label htmlFor={id} className="group flex cursor-pointer gap-3 py-1">
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span
        aria-hidden
        className="mt-[3px] flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[2px] border-[1.5px] border-encre/50 bg-papier transition-colors group-hover:border-encre peer-checked:border-bleu peer-checked:bg-bleu peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-balise"
      >
        {checked && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
      </span>
      <span className="text-[15px]">
        <span className="text-encre">{label}</span>
        {hint && <span className="mt-0.5 block text-[13.5px] leading-snug text-encre-3">{hint}</span>}
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
  const grid = { 1: "", 2: "sm:grid-cols-2", 3: "sm:grid-cols-3", 4: "grid-cols-2 lg:grid-cols-4" }[columns];
  return (
    <div role="radiogroup" className={cn("grid gap-2", grid)}>
      {options.map((o) => {
        const active = value === o.value;
        return (
          <label
            key={o.value}
            className={cn(
              "relative flex cursor-pointer flex-col rounded-sm border bg-papier px-3.5 py-3 pr-9 transition-[border-color,box-shadow] has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-balise",
              active ? "border-bleu shadow-[inset_0_0_0_1px_var(--color-bleu)]" : "border-trait-fort hover:border-encre-3",
            )}
          >
            <input type="radio" name={name} value={o.value} checked={active} onChange={() => onChange(o.value)} className="sr-only" />
            <span
              aria-hidden
              className={cn(
                "absolute right-3 top-3.5 flex h-4 w-4 items-center justify-center rounded-full border-[1.5px]",
                active ? "border-bleu bg-bleu" : "border-encre/40",
              )}
            >
              {active && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
            </span>
            <span className="text-[15px] font-semibold leading-snug">{o.label}</span>
            {o.sub && <span className="mt-0.5 text-[13.5px] leading-snug text-encre-2">{o.sub}</span>}
          </label>
        );
      })}
    </div>
  );
}

export function Spinner({ label = "Chargement" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 py-10 text-encre-2" role="status">
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> {label}…
    </div>
  );
}

export function StepTitle({ n, total, children }: { n: number; total: number; children: ReactNode }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="ref !text-[13px] !text-balise">
        {String(n).padStart(2, "0")}/{String(total).padStart(2, "0")}
      </span>
      <h2 className="display text-[30px]">{children}</h2>
    </div>
  );
}
