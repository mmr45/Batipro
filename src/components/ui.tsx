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
import { AlertTriangle, Check, CheckCircle2, ChevronRight, Info, Loader2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { REGLES_VERSION } from "@rules/reglementation.ts";

// ---------------------------------------------------------------------
// Boutons
// ---------------------------------------------------------------------
type Variant = "primary" | "secondary" | "ghost" | "danger" | "encre" | "inverse" | "verre";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-bleu text-white shadow-[0_1px_2px_rgb(11_18_32/0.12),inset_0_1px_0_rgb(255_255_255/0.18)] hover:bg-bleu-fonce active:translate-y-px",
  encre:
    "bg-encre text-white shadow-[0_1px_2px_rgb(11_18_32/0.2),inset_0_1px_0_rgb(255_255_255/0.12)] hover:bg-[#1b2438] active:translate-y-px",
  secondary:
    "bg-papier text-encre shadow-[0_0_0_1px_rgb(11_18_32/0.1),0_1px_2px_rgb(11_18_32/0.05)] hover:bg-enduit hover:shadow-[0_0_0_1px_rgb(11_18_32/0.16),0_1px_2px_rgb(11_18_32/0.05)] active:translate-y-px",
  ghost: "text-encre-2 hover:bg-enduit-2 hover:text-encre",
  danger: "bg-rouge text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.15)] hover:brightness-110",
  inverse: "bg-white text-encre shadow-[0_1px_2px_rgb(0_0_0/0.2)] hover:bg-white/90 active:translate-y-px",
  verre: "bg-white/8 text-white ring-1 ring-inset ring-white/15 backdrop-blur hover:bg-white/14 active:translate-y-px",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[13.5px] rounded-md gap-1.5",
  md: "h-10 px-4 text-[14.5px] rounded-[10px] gap-2",
  lg: "h-12 px-6 text-[15.5px] rounded-xl gap-2",
};

const base =
  "inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap font-semibold tracking-[-0.01em] transition-[background-color,box-shadow,color,transform] duration-150 disabled:pointer-events-none disabled:opacity-50";

export function btn(variant: Variant = "primary", className?: string, size: Size = "md") {
  return cn(base, sizes[size], variants[variant], className);
}

export function Button({
  variant = "primary",
  size = "md",
  loading,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; loading?: boolean }) {
  return (
    <button className={btn(variant, className, size)} disabled={loading || props.disabled} aria-busy={loading || undefined} {...props}>
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size; className?: string }) {
  return <Link className={btn(variant, className, size)} {...props} />;
}

// ---------------------------------------------------------------------
// Mise en page
// ---------------------------------------------------------------------
export function Container({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("mx-auto w-full max-w-[76rem] px-5 sm:px-8", className)}>{children}</div>;
}

export function revision() {
  const [y, m, d] = REGLES_VERSION.split("-");
  return `${d}.${m}.${y}`;
}

/** Pastille d'information (sur-titres, statuts). */
export function Badge({
  children,
  tone = "neutre",
  className,
  dot,
}: {
  children: ReactNode;
  tone?: "neutre" | "bleu" | "vert" | "orange" | "nuit";
  className?: string;
  dot?: boolean;
}) {
  const t = {
    neutre: "bg-papier text-encre-2 ring-encre/10",
    bleu: "bg-bleu-pale text-bleu-fonce ring-bleu/15",
    vert: "bg-vert-pale text-vert ring-vert/15",
    orange: "bg-balise-pale text-balise-fonce ring-balise/20",
    nuit: "bg-white/8 text-white/85 ring-white/15",
  }[tone];
  const d = { neutre: "bg-encre-3", bleu: "bg-bleu", vert: "bg-vert", orange: "bg-balise", nuit: "bg-balise" }[tone];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12.5px] font-semibold leading-none ring-1 ring-inset", t, className)}>
      {dot && <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", d)} />}
      {children}
    </span>
  );
}

const ETAPES = [
  { to: "/outils/qualification", label: "Qualification" },
  { to: "/outils/statut", label: "Statut" },
  { to: "/outils/inpi", label: "Dossier INPI" },
  { to: "/outils/assurance", label: "Décennale" },
  { to: "/outils/devis", label: "Devis" },
] as const;

/** Fil du parcours en 5 étapes, affiché en tête des outils. */
export function Parcours({ etape }: { etape: number }) {
  return (
    <nav aria-label="Parcours de création" className="no-print -mx-1 overflow-x-auto px-1 pb-1">
      <ol className="flex w-max items-center gap-1 rounded-full bg-papier p-1 shadow-[0_0_0_1px_rgb(11_18_32/0.07),var(--shadow-xs)]">
        {ETAPES.map((e, i) => {
          const n = i + 1;
          const actif = n === etape;
          return (
            <li key={e.to}>
              <Link
                to={e.to}
                aria-current={actif ? "step" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3 text-[13px] font-semibold transition-colors",
                  actif ? "bg-encre text-white" : "text-encre-2 hover:bg-enduit hover:text-encre",
                )}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full text-[11px] tabular-nums",
                    actif ? "bg-white/15 text-white" : "bg-enduit-2 text-encre-3",
                  )}
                >
                  {n}
                </span>
                {e.label}
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

const RUBRIQUES: Record<string, "vert" | "bleu" | "orange" | "neutre"> = {
  "Outil gratuit": "vert",
  "Pack Lancement": "bleu",
  "Abonnement Pro": "orange",
};

/** En-tête de page : fond quadrillé estompé, sur-titre, titre, introduction. */
export function PageHeader({
  title,
  intro,
  children,
  rubrique,
  etape,
  aside,
}: {
  title: string;
  intro?: ReactNode;
  children?: ReactNode;
  rubrique?: string;
  /** Position dans le parcours (1 à 5) : affiche le fil des outils. */
  etape?: number;
  aside?: ReactNode;
}) {
  return (
    <div className="relative overflow-hidden border-b border-encre/[0.06] bg-papier">
      <div aria-hidden className="terrain masque-radial pointer-events-none absolute inset-0 bg-transparent" />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[60rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(47_91_234/0.10),transparent)]"
      />
      <Container className="relative pb-10 pt-8 sm:pb-14 sm:pt-10">
        {etape && <Parcours etape={etape} />}
        <div className={cn("grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end", etape ? "mt-8 sm:mt-10" : "mt-2 sm:mt-6")}>
          <div className="max-w-3xl">
            {rubrique && (
              <Badge tone={RUBRIQUES[rubrique] ?? "neutre"} dot className="mb-4">
                {rubrique}
              </Badge>
            )}
            <h1 className="display text-[36px] sm:text-[52px]">{title}</h1>
            {intro && <div className="mt-4 max-w-2xl text-[17px] leading-relaxed text-encre-2 sm:text-[18px]">{intro}</div>}
            {children}
          </div>
          {aside}
        </div>
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
    <h2 className={cn("display flex items-baseline gap-3 text-[26px] sm:text-[32px]", className)}>
      {num && <span className="ref !text-[13px] !text-bleu">{num}</span>}
      {children}
    </h2>
  );
}

/** En-tête de section centré ou aligné à gauche (sur-titre, titre, chapeau). */
export function SectionHead({
  eyebrow,
  title,
  intro,
  center,
  dark,
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  intro?: ReactNode;
  center?: boolean;
  dark?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("apparait max-w-2xl", center && "mx-auto text-center", className)}>
      {eyebrow && <p className={cn("eyebrow", dark && "!text-bleu-clair")}>{eyebrow}</p>}
      <h2 className={cn("display mt-3 text-[32px] sm:text-[44px]", dark && "text-white")}>{title}</h2>
      {intro && <p className={cn("mt-4 text-[17px] leading-relaxed sm:text-[18px]", dark ? "text-white/65" : "text-encre-2")}>{intro}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------
// Annotations
// ---------------------------------------------------------------------
const tones = {
  info: { cls: "bg-bleu-pale/70 ring-bleu/15", icon: "text-bleu", Icon: Info },
  warn: { cls: "bg-balise-pale ring-balise/20", icon: "text-balise-fonce", Icon: AlertTriangle },
  ok: { cls: "bg-vert-pale ring-vert/15", icon: "text-vert", Icon: CheckCircle2 },
  error: { cls: "bg-rouge-pale ring-rouge/15", icon: "text-rouge", Icon: XCircle },
} as const;

export function Notice({ tone = "info", title, children, className }: { tone?: keyof typeof tones; title?: string; children?: ReactNode; className?: string }) {
  const { cls, icon, Icon } = tones[tone];
  return (
    <div className={cn("flex gap-3 rounded-xl px-4 py-3.5 text-[14.5px] ring-1 ring-inset", cls, className)} role={tone === "error" ? "alert" : undefined}>
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
  return <span className="ref rounded-[5px] bg-encre/[0.05] px-1.5 py-0.5 [box-decoration-break:clone]">{children}</span>;
}

/** Lien fléché discret. */
export function LienFleche({ children, className, ...props }: ComponentProps<typeof Link> & { className?: string; children: ReactNode }) {
  return (
    <Link className={cn("group inline-flex items-center gap-1 font-semibold text-bleu hover:text-bleu-fonce", className)} {...props}>
      {children}
      <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
    </Link>
  );
}

// ---------------------------------------------------------------------
// Formulaires
// ---------------------------------------------------------------------
export function Field({ label, hint, error, htmlFor, children, className }: { label: string; hint?: ReactNode; error?: string; htmlFor?: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-[14px] font-semibold text-encre">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-[13px] leading-snug text-encre-3">{hint}</p>}
      {error && <p className="text-[13px] font-medium text-rouge">{error}</p>}
    </div>
  );
}

const inputCls =
  "w-full rounded-[10px] border-0 bg-papier px-3.5 py-2.5 text-[15.5px] text-encre shadow-[0_0_0_1px_rgb(11_18_32/0.12),0_1px_2px_rgb(11_18_32/0.04)] placeholder:text-encre-3/70 transition-shadow hover:shadow-[0_0_0_1px_rgb(11_18_32/0.22),0_1px_2px_rgb(11_18_32/0.04)] focus:shadow-[0_0_0_1px_var(--color-bleu),0_0_0_4px_rgb(47_91_234/0.15)] focus:outline-none disabled:bg-enduit disabled:text-encre-3 aria-[invalid=true]:shadow-[0_0_0_1px_var(--color-rouge),0_0_0_4px_rgb(209_44_44/0.12)]";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...p }, ref) {
  return <input ref={ref} className={cn(inputCls, className)} {...p} />;
});

export function Select({ className, children, ...p }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        inputCls,
        "appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2214%22 height=%2214%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%237a8499%22 stroke-width=%222.25%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><path d=%22m7 10 5 5 5-5%22/></svg>')] bg-[right_0.85rem_center] bg-no-repeat pr-10",
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
        className={cn(
          "mt-[3px] flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] transition-[background-color,box-shadow] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-bleu",
          checked
            ? "bg-bleu shadow-[inset_0_1px_0_rgb(255_255_255/0.2)]"
            : "bg-papier shadow-[0_0_0_1px_rgb(11_18_32/0.22)] group-hover:shadow-[0_0_0_1px_rgb(11_18_32/0.4)]",
        )}
      >
        {checked && <Check className="h-3 w-3 text-white" strokeWidth={3.5} />}
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
              "relative flex cursor-pointer flex-col rounded-xl bg-papier px-4 py-3 pr-10 transition-[box-shadow,background-color] has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-bleu",
              active
                ? "bg-bleu-pale/40 shadow-[0_0_0_1.5px_var(--color-bleu),0_0_0_5px_rgb(47_91_234/0.10)]"
                : "shadow-[0_0_0_1px_rgb(11_18_32/0.1),0_1px_2px_rgb(11_18_32/0.04)] hover:shadow-[0_0_0_1px_rgb(11_18_32/0.22),0_1px_2px_rgb(11_18_32/0.04)]",
            )}
          >
            <input type="radio" name={name} value={o.value} checked={active} onChange={() => onChange(o.value)} className="sr-only" />
            <span
              aria-hidden
              className={cn(
                "absolute right-3.5 top-3.5 flex h-[18px] w-[18px] items-center justify-center rounded-full transition-colors",
                active ? "bg-bleu" : "shadow-[inset_0_0_0_1.5px_rgb(11_18_32/0.22)]",
              )}
            >
              {active && <span className="h-[7px] w-[7px] rounded-full bg-white" />}
            </span>
            <span className="text-[14.5px] font-semibold leading-snug">{o.label}</span>
            {o.sub && <span className="mt-0.5 text-[13px] leading-snug text-encre-2">{o.sub}</span>}
          </label>
        );
      })}
    </div>
  );
}

export function Spinner({ label = "Chargement" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2.5 py-10 text-[15px] text-encre-3" role="status">
      <Loader2 className="h-4 w-4 animate-spin text-bleu" aria-hidden /> {label}…
    </div>
  );
}

export function StepTitle({ n, total, children }: { n: number; total: number; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-bleu-pale px-2 text-[12.5px] font-semibold tabular-nums text-bleu">
        {n}/{total}
      </span>
      <h2 className="display text-[24px] sm:text-[28px]">{children}</h2>
    </div>
  );
}

/** Icône dans une pastille carrée arrondie. */
export function IconTile({ children, tone = "bleu", className }: { children: ReactNode; tone?: "bleu" | "orange" | "vert" | "nuit" | "violet"; className?: string }) {
  const t = {
    bleu: "bg-bleu-pale text-bleu ring-bleu/10",
    orange: "bg-balise-pale text-balise-fonce ring-balise/15",
    vert: "bg-vert-pale text-vert ring-vert/10",
    nuit: "bg-white/8 text-white ring-white/10",
    violet: "bg-[#f1eefe] text-[#5b3fd9] ring-[#5b3fd9]/10",
  }[tone];
  return <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] ring-1 ring-inset [&_svg]:h-5 [&_svg]:w-5", t, className)}>{children}</span>;
}
