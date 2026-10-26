import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Card, Container, Notice, PageHeader, Spinner } from "@/components/ui";
import { RequireAuth } from "@/components/layout";
import { seo } from "@/lib/seo";
import { useAuth } from "@/lib/auth";
import { sb } from "@/lib/supabase";
import { dateFr } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  head: () => seo({ title: "Administration", description: "Tableau de bord interne.", path: "/admin", noindex: true }),
  component: Page,
});

interface Row {
  user_id: string;
  email: string;
  prenom: string | null;
  nom: string | null;
  created_at: string;
  dossier: boolean;
  pro: boolean;
  submissions: number;
  devis: number;
}

function Page() {
  return (
    <>
      <PageHeader title="Administration" intro="Lecture seule. L'accès est vérifié par la base de données (fonction is_admin)." />
      <Container className="py-10">
        <RequireAuth>
          <Admin />
        </RequireAuth>
      </Container>
    </>
  );
}

function Admin() {
  const { isAdmin, ready } = useAuth();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    sb()
      .rpc("admin_overview")
      .then(({ data, error }) => (error ? setErr(error.message) : setRows(data as Row[])));
  }, [isAdmin]);

  if (!ready) return <Spinner />;
  if (!isAdmin) return <Notice tone="error" title="Accès refusé">Ce compte n'est pas administrateur.</Notice>;
  if (err) return <Notice tone="error">{err}</Notice>;
  if (!rows) return <Spinner />;

  const stats = [
    ["Comptes", rows.length],
    ["Pack Lancement", rows.filter((r) => r.dossier).length],
    ["Abonnés Pro", rows.filter((r) => r.pro).length],
    ["Devis émis", rows.reduce((s, r) => s + Number(r.devis), 0)],
  ] as const;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(([k, n]) => (
          <Card key={k}>
            <p className="text-[14px] text-ardoise-2">{k}</p>
            <p className="display text-5xl">{n}</p>
          </Card>
        ))}
      </div>
      <Card className="overflow-x-auto p-0 sm:p-0">
        <table className="w-full min-w-[44rem] text-left text-[14px]">
          <thead className="border-b border-ardoise/10 text-[13px] text-ardoise-3">
            <tr><th className="px-5 py-3 font-medium">Compte</th><th className="font-medium">Inscrit le</th><th className="font-medium">Lancement</th><th className="font-medium">Pro</th><th className="font-medium">Soumissions</th><th className="px-5 font-medium">Devis</th></tr>
          </thead>
          <tbody className="divide-y divide-ardoise/10">
            {rows.map((r) => (
              <tr key={r.user_id}>
                <td className="px-5 py-2.5">{[r.prenom, r.nom].filter(Boolean).join(" ") || "—"}<span className="block text-ardoise-3">{r.email}</span></td>
                <td>{dateFr(r.created_at)}</td>
                <td>{r.dossier ? "Oui" : "—"}</td>
                <td>{r.pro ? "Oui" : "—"}</td>
                <td>{r.submissions}</td>
                <td className="px-5">{r.devis}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
