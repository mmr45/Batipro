import { useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui";
import { FORMES, calculerTotaux, construireMentions, libelleMetier, nomEmetteur, totalLigne, type DevisData } from "@rules/devis.ts";
import { NATURE_TRAVAUX_LABEL, formatEuro } from "@rules/reglementation.ts";

/**
 * Aperçu du devis tel qu'il sera imprimé : même mise en page générale que le
 * PDF, mêmes totaux et mêmes mentions (calculés par les règles partagées).
 */
export function ApercuDevis({ d, onClose, onGenerer, busy }: { d: DevisData; onClose: () => void; onGenerer: () => void; busy: boolean }) {
  const t = calculerTotaux(d);
  const mentions = construireMentions(d);
  const forme = FORMES.find((f) => f.value === d.em_forme)?.label ?? "";
  const aujourdhui = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div role="dialog" aria-modal="true" aria-label="Aperçu du devis" className="fixed inset-0 z-50 flex flex-col bg-nuit/70 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-3 bg-nuit px-4 py-3 text-white sm:px-6">
        <p className="font-semibold">Aperçu du devis</p>
        <div className="flex items-center gap-2">
          <Button size="sm" loading={busy} onClick={onGenerer}>Générer le PDF</Button>
          <Button size="sm" variant="verre" onClick={onClose} aria-label="Fermer l'aperçu"><X className="h-4 w-4" /></Button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-6 sm:px-6 sm:py-10" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <article className="mx-auto w-full max-w-[52rem] rounded-sm bg-white text-[13px] leading-snug text-encre shadow-2xl">
          <div className="h-1.5 bg-bleu" />
          <div className="space-y-6 p-5 sm:p-10">
            <header className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                {d.em_logo_dataurl && <img src={d.em_logo_dataurl} alt="" className="h-12 max-w-[7rem] object-contain" />}
                <div>
                  <p className="text-[16px] font-bold">{nomEmetteur(d) || "Votre entreprise"}</p>
                  <p className="text-[11.5px] text-encre-3">{[libelleMetier(d.em_metier), forme].filter(Boolean).join(" — ")}</p>
                  {d.em_qualification && <p className="text-[11.5px] text-encre-3">{d.em_qualification}</p>}
                </div>
              </div>
              <div className="text-right">
                <p className="text-[24px] font-bold tracking-tight text-bleu">DEVIS</p>
                <p className="text-[11.5px]">N° attribué à la génération</p>
                <p className="text-[11.5px] text-encre-3">Établi le {aujourdhui} — valable {d.co_validite_jours} jours</p>
              </div>
            </header>

            <div className="grid gap-6 border-t border-trait pt-5 sm:grid-cols-2">
              <div>
                <p className="text-[10.5px] font-bold tracking-wider text-encre-3">ENTREPRISE</p>
                {[d.em_adresse, d.em_siret && `SIRET : ${d.em_siret}`, d.em_immatriculation, !d.em_franchise && d.em_tva_intra && `TVA intracom. : ${d.em_tva_intra}`, [d.em_tel, d.em_email].filter(Boolean).join(" — ")]
                  .filter(Boolean)
                  .map((l) => <p key={String(l)}>{l}</p>)}
              </div>
              <div>
                <p className="text-[10.5px] font-bold tracking-wider text-encre-3">{d.cl_type === "pro" ? "CLIENT PROFESSIONNEL" : "CLIENT"}</p>
                <p className="font-semibold">{d.cl_nom || "—"}</p>
                {[d.cl_adresse, d.cl_siret && `SIRET : ${d.cl_siret}`, [d.cl_tel, d.cl_email].filter(Boolean).join(" — ")].filter(Boolean).map((l) => <p key={String(l)}>{l}</p>)}
              </div>
            </div>

            <div className="rounded-md bg-enduit px-4 py-3">
              <p className="font-semibold">{d.ch_intitule || "Travaux"}</p>
              <p className="text-[11.5px] text-encre-3">Lieu du chantier : {d.ch_adresse || d.cl_adresse || "—"}</p>
              <p className="text-[11.5px] text-encre-3">
                {[NATURE_TRAVAUX_LABEL[d.ch_nature], d.ch_debut && `début prévu le ${new Date(d.ch_debut).toLocaleDateString("fr-FR")}`, d.ch_duree && `durée estimée : ${d.ch_duree}`].filter(Boolean).join(" — ")}
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[34rem] border-collapse">
                <thead>
                  <tr className="bg-encre text-left text-[11px] text-white">
                    <th className="px-2.5 py-2 font-semibold">Désignation</th>
                    <th className="px-2 py-2 text-right font-semibold">Qté</th>
                    <th className="px-2 py-2 font-semibold">Unité</th>
                    <th className="px-2 py-2 text-right font-semibold">PU HT</th>
                    <th className="px-2 py-2 text-right font-semibold">TVA</th>
                    <th className="px-2.5 py-2 text-right font-semibold">Total HT</th>
                  </tr>
                </thead>
                <tbody>
                  {d.lignes.map((l, i) => (
                    <tr key={i} className={i % 2 ? "bg-enduit" : ""}>
                      <td className="px-2.5 py-1.5 align-top">{l.designation}</td>
                      <td className="px-2 py-1.5 text-right align-top tabular-nums">{String(l.quantite).replace(".", ",")}</td>
                      <td className="px-2 py-1.5 align-top">{l.unite}</td>
                      <td className="px-2 py-1.5 text-right align-top tabular-nums whitespace-nowrap">{formatEuro(l.prixUnitaireHT)}</td>
                      <td className="px-2 py-1.5 text-right align-top tabular-nums whitespace-nowrap">{d.em_franchise ? "-" : `${String(l.tva).replace(".", ",")} %`}</td>
                      <td className="px-2.5 py-1.5 text-right align-top tabular-nums whitespace-nowrap">{formatEuro(totalLigne(l))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="ml-auto w-full max-w-[20rem] space-y-1 tabular-nums">
              {t.remise > 0 && (
                <>
                  <Ligne k="Total HT avant remise" v={formatEuro(t.totalHTBrut)} />
                  <Ligne k={`Remise (${d.co_remise_pct} %)`} v={`- ${formatEuro(t.remise)}`} />
                </>
              )}
              <Ligne k={t.remise > 0 ? "Total HT net" : "Total HT"} v={formatEuro(t.totalHT)} />
              {d.em_franchise ? <Ligne k="TVA" v="non applicable" /> : t.tvaParTaux.map((x) => <Ligne key={x.taux} k={`TVA ${String(x.taux).replace(".", ",")} %`} v={formatEuro(x.montant)} />)}
              <div className="flex justify-between rounded bg-bleu-pale px-2 py-1.5 text-[14px] font-bold">
                <span>Total TTC</span>
                <span>{formatEuro(t.totalTTC)}</span>
              </div>
              {t.acompte > 0 && <Ligne k={`Acompte à la signature (${d.co_acompte_pct} %)`} v={formatEuro(t.acompte)} />}
            </div>

            {d.co_notes.trim() && (
              <section>
                <p className="font-semibold">Précisions</p>
                <p className="whitespace-pre-line">{d.co_notes}</p>
              </section>
            )}

            <section>
              <p className="font-semibold">Conditions et mentions légales</p>
              <ul className="mt-1.5 space-y-1 text-[10.5px] text-encre-2">
                {mentions.map((m) => <li key={m}>• {m}</li>)}
              </ul>
            </section>

            <section className="grid gap-4 sm:grid-cols-2">
              {["L'entreprise", "Le client"].map((titre, i) => (
                <div key={titre} className="h-28 rounded border border-trait-fort p-3">
                  <p className="text-[11.5px] font-semibold">{titre}</p>
                  <p className="text-[10.5px] text-encre-3">
                    {i ? "Date, signature précédées de la mention « Devis reçu avant l'exécution des travaux, bon pour accord »" : "Date et signature"}
                  </p>
                </div>
              ))}
            </section>
          </div>
        </article>
      </div>
    </div>
  );
}

function Ligne({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3 px-2">
      <span className="text-encre-2">{k}</span>
      <span>{v}</span>
    </div>
  );
}
