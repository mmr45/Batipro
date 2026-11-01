import { useEffect } from "react";

/**
 * Effets de relief, montés une seule fois à la racine.
 * - `.relief` : la carte s'incline sous le pointeur et reçoit un reflet.
 * - `.scene-3d` : la scène suit légèrement le pointeur (parallaxe).
 * Délégation d'événements : aucun écouteur par carte. Inactif sur écran
 * tactile et quand l'utilisateur demande moins d'animations.
 */
export function Effets() {
  useEffect(() => {
    const fin = window.matchMedia("(hover: hover) and (pointer: fine)");
    const calme = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!fin.matches || calme.matches) return;

    let carte: HTMLElement | null = null;
    let scene: HTMLElement | null = null;
    let frame = 0;
    let dernier: PointerEvent | null = null;

    const lacher = (el: HTMLElement | null, vars: string[], classe?: string) => {
      if (!el) return;
      for (const v of vars) el.style.removeProperty(v);
      if (classe) el.classList.remove(classe);
    };

    const appliquer = () => {
      frame = 0;
      const e = dernier;
      if (!e) return;
      const cible = e.target instanceof Element ? e.target : null;

      const c = cible?.closest<HTMLElement>(".relief") ?? null;
      if (c !== carte) {
        lacher(carte, ["--rx", "--ry", "--mx", "--my"], "sous-pointeur");
        carte = c;
      }
      if (carte) {
        const r = carte.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        // Inclinaison plus douce sur les grandes cartes
        const max = r.width > 520 ? 4 : 8;
        carte.classList.add("sous-pointeur");
        carte.style.setProperty("--ry", `${((x - 0.5) * max).toFixed(2)}deg`);
        carte.style.setProperty("--rx", `${((0.5 - y) * max).toFixed(2)}deg`);
        carte.style.setProperty("--mx", `${(x * 100).toFixed(1)}%`);
        carte.style.setProperty("--my", `${(y * 100).toFixed(1)}%`);
      }

      const zone = cible?.closest<HTMLElement>("[data-scene]") ?? null;
      const s = zone?.querySelector<HTMLElement>(".scene-3d") ?? null;
      if (s !== scene) {
        lacher(scene, ["--px", "--py"]);
        scene = s;
      }
      if (scene && zone) {
        const r = zone.getBoundingClientRect();
        scene.style.setProperty("--px", (((e.clientX - r.left) / r.width - 0.5) * 2).toFixed(3));
        scene.style.setProperty("--py", (((e.clientY - r.top) / r.height - 0.5) * 2).toFixed(3));
      }
    };

    const bouger = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      dernier = e;
      if (!frame) frame = requestAnimationFrame(appliquer);
    };
    const sortir = () => {
      lacher(carte, ["--rx", "--ry", "--mx", "--my"], "sous-pointeur");
      lacher(scene, ["--px", "--py"]);
      carte = scene = null;
    };

    document.addEventListener("pointermove", bouger, { passive: true });
    document.documentElement.addEventListener("pointerleave", sortir);
    return () => {
      document.removeEventListener("pointermove", bouger);
      document.documentElement.removeEventListener("pointerleave", sortir);
      if (frame) cancelAnimationFrame(frame);
      sortir();
    };
  }, []);

  return null;
}
