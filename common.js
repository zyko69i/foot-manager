(function () {
  const NAV = [["index.html","Tableau de bord"],["categories.html","Catégories"],["matchs.html","Matchs"],["presences.html","Présences"],["convocations.html","Convocations"],["documents.html","Documents"],["terrains.html","Terrains"],["contacts.html","Contacts"],["parametres.html","Paramètres"],["export.html","Export"]];
  const CATS = []; for (let a = 6; a <= 18; a++) CATS.push("U" + a);
  const STAT = ["Actif","Blessé","Suspendu"], POS = ["Gardien","Défenseur","Milieu","Attaquant","Non défini"], COMP = ["Championnat","Coupe","Amical","Tournoi"];
  const DOCS = ["Licence","Certificat médical","Autorisation parentale","Règlement signé"], MAX_CONVOC = 14, DEF_CLUB = "MIMOUNI Soccer Stats";
  const DAYS = ["Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi","Dimanche"], ROLES = ["Président","Entraîneur","Responsable catégorie","Secrétaire","Trésorier","Médecin","Mairie","Urgence","Autre"];
  const VENUES = [{ n: "Grand terrain synthétique", s: "Synthétique", g: 0 }, { n: "Grand terrain en herbe 1", s: "Herbe", g: 0 }, { n: "Grand terrain en herbe 2", s: "Herbe", g: 0 }, { n: "Gymnase", s: "Salle", g: 1 }];
  // Découpage des grands terrains selon la catégorie (à ajuster ici si besoin) : U6-U8 en 6, U9-U13 en 2, U14+ terrain entier
  const SPLIT = c => { const a = +c.slice(1); return a <= 8 ? 6 : a <= 13 ? 2 : 1; };
  const EM = /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']{2,}$/, PH = /^[+()\d .-]{2,20}$/;
  const PRE = ["Adam","Yanis","Lucas","Nathan","Ilyes","Hugo","Rayan","Enzo","Mathis","Noa","Karim","Tom","Léo","Sofiane","Axel","Malik","Ethan","Jules","Samy","Nolan"];
  const NOM = ["Martin","Bernard","Dubois","Moreau","Laurent","Simon","Michel","Lefebvre","Leroy","Roux","David","Bertrand","Morel","Fournier","Girard","Bonnet","Dupont","Lambert","Fontaine","Rousseau"];

  // ---------- Utilitaires ----------
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const opts = (list, sel) => list.map(o => `<option${o === sel ? " selected" : ""}>${esc(o)}</option>`).join("");
  const sp = s => String(s == null ? "" : s).replace(/\s+/g, " ").trim();
  const norm = s => sp(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const int = (v, max) => { const n = Math.trunc(+v); return Number.isFinite(n) ? Math.min(Math.max(n, 0), max) : 0; };
  const today = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
  const validDate = s => /^\d{4}-\d{2}-\d{2}$/.test(s || "") && !isNaN(new Date(s)) && s >= "2000-01-01" && s <= "2100-12-31";
  const fdate = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" }); };
  const nextId = a => a.reduce((m, x) => Math.max(m, x.id), -1) + 1;
  const byNum = (a, b) => a.num - b.num;
  const bd = s => `<span class="badge ${s}">${s}</span>`;
  const tbl = (head, rows) => `<div class="tw"><table><thead><tr>${head.map(h => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table></div>`;
  const cell = v => { v = v == null ? "" : String(v); if (/^[=+\-@\t\r]/.test(v)) v = "'" + v; return /[;"\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  const csv = rows => rows.map(r => r.map(cell).join(";")).join("\n");

  function toast(t) {
    let e = $("toast");
    if (!e) { e = document.createElement("div"); e.id = "toast"; e.setAttribute("role", "status"); document.body.appendChild(e); }
    e.textContent = t; e.style.display = "block"; clearTimeout(toast.t); toast.t = setTimeout(() => { e.style.display = "none"; }, 3500);
  }
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { toast("Enregistrement impossible (stockage plein ou bloqué)."); return false; } },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} }
  };
  function download(name, text, type, bom) {
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([(bom ? "\uFEFF" : "") + text], { type: type + ";charset=utf-8" }));
    a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  // ---------- Données : nettoyage, migration, valeurs de départ ----------
  const cleanP = (p, i) => ({ id: Number.isInteger(p.id) ? p.id : i, cat: CATS.includes(p.cat) ? p.cat : "U6", name: sp(p.name).slice(0, 60) || "Joueur", status: STAT.includes(p.status) ? p.status : "Actif", pos: POS.includes(p.pos) ? p.pos : "Non défini", num: p.num >= 1 && p.num <= 99 ? Math.trunc(p.num) : null, g: int(p.g, 999), a: int(p.a, 999), m: int(p.m, 9999), y: int(p.y, 99), r: int(p.r, 99) });
  const cleanM = (m, i) => { const ok = m.sf != null && m.sf !== "" && m.sa != null && m.sa !== ""; return { id: Number.isInteger(m.id) ? m.id : i, date: validDate(m.date) ? m.date : today(), time: /^\d{2}:\d{2}$/.test(m.time || "") ? m.time : "", cat: CATS.includes(m.cat) ? m.cat : "U13", opp: sp(m.opp).slice(0, 60) || "Adversaire", home: m.home !== false, comp: COMP.includes(m.comp) ? m.comp : "Championnat", sf: ok ? int(m.sf, 99) : null, sa: ok ? int(m.sa, 99) : null }; };
  const hm = s => /^\d{2}:\d{2}$/.test(s || "") ? +s.slice(0, 2) * 60 + +s.slice(3) : null;
  const fm = m => String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
  const cleanT = (t, i) => ({ id: Number.isInteger(t.id) ? t.id : i, day: DAYS.includes(t.day) ? t.day : "Lundi", time: hm(t.time) === null ? "18:00" : t.time, dur: Math.min(Math.max(int(t.dur, 300), 15), 300), venue: VENUES.some(v => v.n === t.venue) ? t.venue : VENUES[0].n, cat: CATS.includes(t.cat) ? t.cat : "U6" });
  const cleanC = (c, i) => ({ id: Number.isInteger(c.id) ? c.id : i, name: sp(c.name).slice(0, 60) || "Contact", role: ROLES.includes(c.role) ? c.role : "Autre", cat: CATS.includes(c.cat) ? c.cat : "", phone: PH.test(sp(c.phone)) ? sp(c.phone) : "", email: EM.test(sp(c.email)) ? sp(c.email).slice(0, 80) : "" });
  const seedContacts = () => [{ id: 0, name: "SAMU", role: "Urgence", cat: "", phone: "15", email: "" }, { id: 1, name: "Pompiers", role: "Urgence", cat: "", phone: "18", email: "" }, { id: 2, name: "Numéro d'urgence européen", role: "Urgence", cat: "", phone: "112", email: "" }];
  function fillNums(list) { CATS.forEach(c => { const used = new Set(list.filter(p => p.cat === c && p.num).map(p => p.num)); list.filter(p => p.cat === c && !p.num).forEach(p => { let n = 1; while (used.has(n)) n++; p.num = n; used.add(n); }); }); }
  function seedPlayers() {
    const out = []; let g = 0;
    CATS.forEach((c, ci) => { for (let i = 0; i < 20; i++, g++) { const m = g % 13, pos = i < 2 ? "Gardien" : i < 8 ? "Défenseur" : i < 14 ? "Milieu" : "Attaquant";
      out.push({ id: g, cat: c, name: PRE[i] + " " + NOM[(i * 7 + ci * 3) % 20], status: (m === 3 || m === 8) ? "Blessé" : m === 11 ? "Suspendu" : "Actif", pos, num: i + 1, g: pos === "Gardien" ? 0 : (g * 7) % 9, a: (g * 5) % 7, m: (g * 37) % 900, y: (g * 3) % 4, r: g % 17 === 0 ? 1 : 0 }); } });
    return out;
  }
  const seedMatches = () => [
    { id: 0, date: "2026-11-15", time: "10:30", cat: "U13", opp: "AS Marseille Nord", home: true, comp: "Championnat", sf: 3, sa: 1 },
    { id: 1, date: "2026-11-22", time: "15:00", cat: "U15", opp: "FC Littoral", home: false, comp: "Championnat", sf: 0, sa: 2 },
    { id: 2, date: "2026-12-06", time: "10:00", cat: "U11", opp: "US Calanques", home: true, comp: "Coupe", sf: null, sa: null },
    { id: 3, date: "2026-12-13", time: "14:30", cat: "U17", opp: "Olympique Sud", home: false, comp: "Amical", sf: null, sa: null }
  ];
  let P, M, T, C;
  const saveP = () => store.set("players", P), saveM = () => store.set("matches", M), saveT = () => store.set("trainings", T), saveC = () => store.set("contacts", C);
  function loadAll(save) {
    const p = store.get("players", null), m = store.get("matches", null);
    P = Array.isArray(p) ? p.map(cleanP) : seedPlayers(); fillNums(P);
    M = Array.isArray(m) ? m.map(cleanM) : seedMatches();
    const t = store.get("trainings", null), c = store.get("contacts", null);
    T = Array.isArray(t) ? t.map(cleanT) : []; C = Array.isArray(c) ? c.map(cleanC) : seedContacts();
    if (save) { saveP(); saveM(); saveT(); saveC(); }
  }
  function purge(id) { // supprime les traces d'un joueur supprimé
    ["pres", "conv"].forEach(k => { const o = store.get(k, {}); Object.keys(o).forEach(c => { o[c] = o[c].filter(i => i !== id); }); store.set(k, o); });
    const dc = store.get("docs", {}); delete dc[id]; store.set("docs", dc);
  }
  const done = m => m.sf !== null && m.sa !== null;
  const res = m => m.sf > m.sa ? "V" : m.sf < m.sa ? "D" : "N";
  const RB = { V: "Actif", N: "Suspendu", D: "Blessé" };
  loadAll(true);

  // ---------- Formulaires ----------
  function dialog(title, fields, v, validate, onSave) {
    const d = document.createElement("dialog");
    const inp = f => f.t === "select" ? `<select name="${f.n}">${opts(f.o, v[f.n])}</select>` : `<input name="${f.n}" type="${f.t}" value="${esc(v[f.n] ?? "")}"${f.r ? " required" : ""}${f.t === "number" ? ` min="${f.mn ?? 0}" max="${f.x || 999}" step="1" inputmode="numeric"` : f.t === "text" ? ' maxlength="60"' : ""}>`;
    d.innerHTML = `<form method="dialog"><h2>${title}</h2><div class="grid2">${fields.map(f => `<label class="field${f.w ? " wide" : ""}">${f.l}${inp(f)}</label>`).join("")}</div><p class="err" role="alert"></p><div class="acts"><button class="btn" type="submit">Enregistrer</button><button class="btn alt" type="button">Annuler</button></div></form>`;
    document.body.appendChild(d);
    const form = d.querySelector("form");
    form.addEventListener("submit", e => { e.preventDefault(); const o = {}; new FormData(form).forEach((x, k) => { o[k] = x; }); const err = validate(o); if (err) { d.querySelector(".err").textContent = err; return; } onSave(o); d.close(); });
    d.querySelector("button[type=button]").addEventListener("click", () => d.close());
    d.addEventListener("close", () => d.remove());
    d.showModal();
  }
  const PF = [{ n: "name", l: "Nom", t: "text", r: 1, w: 1 }, { n: "cat", l: "Catégorie", t: "select", o: CATS }, { n: "status", l: "Statut", t: "select", o: STAT }, { n: "pos", l: "Poste", t: "select", o: POS }, { n: "num", l: "N° de maillot", t: "number", mn: 1, x: 99, r: 1 }, { n: "g", l: "Buts", t: "number" }, { n: "a", l: "Passes décisives", t: "number" }, { n: "y", l: "Cartons jaunes", t: "number", x: 99 }, { n: "r", l: "Cartons rouges", t: "number", x: 99 }, { n: "m", l: "Minutes jouées", t: "number", x: 9999 }];
  const pl = o => ({ name: sp(o.name), cat: o.cat, status: o.status, pos: o.pos, num: int(o.num, 99), g: int(o.g, 999), a: int(o.a, 999), m: int(o.m, 9999), y: int(o.y, 99), r: int(o.r, 99) });
  const vP = cur => o => {
    const n = norm(o.name); if (!n) return "Le nom est obligatoire.";
    const dup = P.find(p => p !== cur && p.cat === o.cat && norm(p.name) === n); if (dup) return "« " + dup.name + " » existe déjà en " + o.cat + ".";
    const nu = P.find(p => p !== cur && p.cat === o.cat && p.num === +o.num); return nu ? "Le n° " + o.num + " est déjà pris par " + nu.name + " en " + o.cat + "." : "";
  };
  const MF = [{ n: "date", l: "Date", t: "date", r: 1 }, { n: "time", l: "Heure (facultatif)", t: "time" }, { n: "cat", l: "Catégorie", t: "select", o: CATS }, { n: "comp", l: "Compétition", t: "select", o: COMP }, { n: "opp", l: "Adversaire", t: "text", r: 1, w: 1 }, { n: "home", l: "Lieu", t: "select", o: ["Domicile", "Extérieur"] }, { n: "sf", l: "Nos buts (vide si à jouer)", t: "number", x: 99 }, { n: "sa", l: "Buts adverses", t: "number", x: 99 }];
  const ml = o => ({ date: o.date, time: o.time || "", cat: o.cat, comp: o.comp, opp: sp(o.opp), home: o.home === "Domicile", sf: o.sf === "" ? null : int(o.sf, 99), sa: o.sa === "" ? null : int(o.sa, 99) });
  const vM = cur => o => {
    if (!validDate(o.date)) return "Date invalide."; if (!norm(o.opp)) return "L'adversaire est obligatoire.";
    if ((o.sf === "") !== (o.sa === "")) return "Renseigne les deux scores, ou laisse-les vides.";
    if (o.sf !== "" && o.date > today()) return "Impossible de saisir un score pour un match à venir.";
    const c = M.find(m => m !== cur && m.cat === o.cat && m.date === o.date); return c ? o.cat + " a déjà un match ce jour-là (contre " + c.opp + ")." : "";
  };

  // ---------- Squelette de page ----------
  const css = document.createElement("style");
  css.textContent = ".grid2{display:grid;grid-template-columns:1fr 1fr;gap:0 12px}.wide{grid-column:1/-1}.err{color:#b3261e;font-size:14px;min-height:20px;margin:4px 0}dialog{max-height:90vh;overflow:auto}#toast{display:none;position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#222;color:#fff;padding:12px 18px;border-radius:12px;z-index:500;font-size:15px}.bar label{display:flex;align-items:center;gap:8px}";
  css.textContent += "main.dash{max-width:1120px}.hero{background:linear-gradient(135deg,#2FAEE0,#1769a0);color:#fff;border-radius:24px;padding:28px 32px;margin-bottom:24px;box-shadow:0 10px 30px rgba(23,105,160,.25)}.hero h1{color:#fff;margin:0 0 6px;font-size:30px}.hero p{opacity:.92}.hero p::first-letter{text-transform:uppercase}.chips{display:flex;flex-wrap:wrap;gap:10px;margin-top:16px}.chips span{background:rgba(255,255,255,.18);padding:6px 14px;border-radius:20px;font-size:14px}.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:16px;margin-bottom:20px}.kpi{display:flex;flex-direction:column;gap:2px;background:#fff;border:1px solid #eef1f4;border-radius:18px;padding:18px;text-decoration:none;color:inherit;box-shadow:0 4px 14px rgba(0,0,0,.04);transition:transform .15s,box-shadow .15s,border-color .15s}.kpi:hover{transform:translateY(-3px);box-shadow:0 10px 24px rgba(0,0,0,.08);border-color:#2FAEE0}.kpi .ic{font-size:22px}.kpi .v{font-size:32px;font-weight:700;color:#1769a0;line-height:1.1}.kpi .l{font-size:13px;color:#666}.kpi.warn .v{color:#b3261e}.kpi.ok .v{color:#1b7a37}.alerts{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:28px}.alerts a,.alerts .good{border-radius:12px;padding:10px 14px;font-size:14px;font-weight:600;text-decoration:none;background:#fff4e0;color:#7a4a00}.alerts .good{background:#e8f7ec;color:#1b7a37}.alerts a:hover{filter:brightness(.96)}.sec{margin-bottom:32px;min-width:0}.sh{display:flex;justify-content:space-between;align-items:baseline;margin:0 0 12px}.sh h2{margin:0;font-size:19px}.sh a{color:#2FAEE0;font-size:14px;text-decoration:none;font-weight:600}.grid2c.g3{grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr))}.grid2c{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr));gap:0 24px}tr.go{cursor:pointer}tr.go:hover td,tr.go:focus-visible td{background:#f2f9fd}tr.tot td{font-weight:700;background:#f7fbff}.dash th{background:#fafcfe;font-size:12px;text-transform:uppercase;letter-spacing:.03em}.dash td a{color:#2FAEE0}";
  document.head.appendChild(css);
  const page = document.body.dataset.page;
  const club = store.get("club", DEF_CLUB);
  document.title = ((NAV.find(n => n[0] === page + ".html") || [0, ""])[1]) + " – " + club;
  document.body.innerHTML = `<header><div class="logo" id="logo"></div></header>
<button class="floating-burger" id="burger" type="button" aria-label="Ouvrir le menu" aria-controls="menu" aria-expanded="false">☰</button>
<div id="overlay"></div>
<nav id="menu" aria-label="Menu principal"><div class="nav-header"><img src="favicon.svg" alt=""><span id="navname"></span></div>${NAV.map(([h, t]) => `<a href="${h}"${h === page + ".html" ? ' class="active" aria-current="page"' : ""}>${t}</a>`).join("")}</nav>
<main id="main"></main>`;
  $("logo").textContent = club; $("navname").textContent = club;
  const main = $("main");
  function setMenu(open) {
    $("menu").classList.toggle("open", open); $("overlay").classList.toggle("open", open);
    $("burger").setAttribute("aria-expanded", String(open)); $("burger").setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
  }
  $("burger").addEventListener("click", () => setMenu(!$("menu").classList.contains("open")));
  $("overlay").addEventListener("click", () => setMenu(false));
  document.addEventListener("keydown", e => { if (e.key === "Escape") setMenu(false); });

  // ---------- Pages ----------
  const pages = {
    index() {
      main.className = "dash";
      const t = today(), n = s => P.filter(p => p.status === s).length, q = encodeURIComponent;
      const played = M.filter(done), c = r => played.filter(m => res(m) === r).length;
      const bp = played.reduce((s, m) => s + m.sf, 0), bc = played.reduce((s, m) => s + m.sa, 0);
      const upcoming = M.filter(m => !done(m) && m.date >= t).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
      const noScore = M.filter(m => !done(m) && m.date < t);
      const dc = store.get("docs", {}), full = p => (dc[p.id] || []).length === DOCS.length, incompl = P.filter(p => !full(p)).length;
      const sd = d => d.slice(8) + "/" + d.slice(5, 7), pct = (a, b) => (b ? Math.round(100 * a / b) : 0) + " %";
      const go = (h, cells) => `<tr class="go" data-href="${h}" tabindex="0">${cells}</tr>`;
      const kpi = (ic, v, l, h, tone) => `<a class="kpi ${tone || ""}" href="${h}"><span class="ic">${ic}</span><span class="v">${v}</span><span class="l">${l}</span></a>`;
      const sec = (title, h, body) => `<section class="sec"><div class="sh"><h2>${title}</h2><a href="${h}">Tout voir →</a></div>${body}</section>`;
      const none = `<p class="note">Aucune donnée pour l'instant.</p>`;
      const tel = p => p ? `<a href="tel:${esc(p.replace(/[^\d+]/g, ""))}">${esc(p)}</a>` : "—";
      const top = (f, h, cols) => { const L = [...P].filter(p => f(p) > 0).sort((a, b) => f(b) - f(a) || a.name.localeCompare(b.name)).slice(0, 5); return L.length ? tbl(h, L.map(p => go("categories.html?c=" + p.cat, `<td>${esc(p.name)}</td><td>${p.cat}</td>${cols(p)}`)).join("")) : none; };
      const al = [];
      if (noScore.length) al.push(["matchs.html", "⚠️", noScore.length + " match(s) passé(s) sans score"]);
      if (incompl) al.push(["documents.html", "📄", incompl + " dossier(s) joueur incomplet(s)"]);
      if (n("Blessé")) al.push(["categories.html?s=" + q("Blessé"), "🩹", n("Blessé") + " joueur(s) blessé(s)"]);
      if (n("Suspendu")) al.push(["categories.html?s=Suspendu", "🟥", n("Suspendu") + " joueur(s) suspendu(s)"]);
      if (!T.length) al.push(["terrains.html", "🏟️", "Aucun entraînement planifié"]);
      const eff = CATS.map(k => { const L = P.filter(p => p.cat === k), a = st => L.filter(p => p.status === st).length, nm = upcoming.find(m => m.cat === k);
        return go("categories.html?c=" + k, `<td><b>${k}</b></td><td>${L.length}</td><td>${a("Actif")}</td><td>${a("Blessé")}</td><td>${a("Suspendu")}</td><td>${L.reduce((s, p) => s + p.g, 0)}</td><td>${pct(L.filter(full).length, L.length)}</td><td>${nm ? sd(nm.date) + " – " + esc(nm.opp) : "—"}</td><td>${T.filter(x => x.cat === k).length}</td>`); }).join("");
      const tot = `<tr class="tot"><td>Total</td><td>${P.length}</td><td>${n("Actif")}</td><td>${n("Blessé")}</td><td>${n("Suspendu")}</td><td>${P.reduce((s, p) => s + p.g, 0)}</td><td>${pct(P.length - incompl, P.length)}</td><td>${upcoming.length} à venir</td><td>${T.length}</td></tr>`;
      const inst = VENUES.map(v => { const L = T.filter(x => x.venue === v.n); return go("terrains.html", `<td>${v.n}</td><td>${v.s}</td><td>${v.g ? "Entraînement" : "Entr. + matchs"}</td><td>${L.length}</td><td>${(L.reduce((s, x) => s + x.dur, 0) / 60).toFixed(1).replace(".", ",")} h</td>`); }).join("");
      const ct = [...C].sort((a, b) => ROLES.indexOf(a.role) - ROLES.indexOf(b.role) || a.name.localeCompare(b.name)).slice(0, 6);
      const last = [...played].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
      main.innerHTML = `<div class="hero"><h1>Tableau de bord</h1><p>${esc(club)} · ${new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p><div class="chips"><span>🏆 ${c("V")} V · ${c("N")} N · ${c("D")} D</span><span>⚽ ${bp} marqués · ${bc} encaissés</span><span>📅 ${upcoming.length} match(s) à venir</span><span>🏟️ ${T.length} entraînement(s) / semaine</span></div></div>
<div class="kpis">${kpi("👥", P.length, "Joueurs", "categories.html")}${kpi("✅", n("Actif"), "Actifs", "categories.html?s=Actif", "ok")}${kpi("🩹", n("Blessé"), "Blessés", "categories.html?s=" + q("Blessé"), n("Blessé") ? "warn" : "")}${kpi("🟥", n("Suspendu"), "Suspendus", "categories.html?s=Suspendu", n("Suspendu") ? "warn" : "")}${kpi("⚽", played.length, "Matchs joués", "matchs.html")}${kpi("🏆", c("V"), "Victoires", "matchs.html", "ok")}${kpi("📅", upcoming.length, "Matchs à venir", "matchs.html")}${kpi("🏟️", T.length, "Entraînements", "terrains.html")}${kpi("📇", C.length, "Contacts", "contacts.html")}${kpi("📄", incompl, "Dossiers incomplets", "documents.html", incompl ? "warn" : "ok")}</div>
<div class="alerts">${al.length ? al.map(a => `<a href="${a[0]}">${a[1]} ${a[2]}</a>`).join("") : `<span class="good">✅ Tout est en ordre</span>`}</div>
${sec("Effectif par catégorie", "categories.html", tbl(["Cat.", "Joueurs", "Actifs", "Blessés", "Susp.", "Buts", "Dossiers", "Prochain match", "Entr."], eff + tot))}
<div class="grid2c">${sec("Prochains matchs", "matchs.html", upcoming.length ? tbl(["Date", "Cat.", "Adversaire", "Compét.", "Lieu"], upcoming.slice(0, 5).map(m => go("matchs.html", `<td>${sd(m.date)}${m.time ? " " + m.time : ""}</td><td>${m.cat}</td><td>${esc(m.opp)}</td><td>${m.comp}</td><td>${m.home ? "Dom." : "Ext."}</td>`)).join("")) : `<p class="note">Aucun match à venir.</p>`)}
${sec("Derniers résultats", "matchs.html", last.length ? tbl(["Date", "Cat.", "Adversaire", "Score", ""], last.map(m => go("matchs.html", `<td>${sd(m.date)}</td><td>${m.cat}</td><td>${esc(m.opp)}</td><td>${m.sf} - ${m.sa}</td><td>${bd(RB[res(m)]).replace(RB[res(m)] + "</span>", res(m) + "</span>")}</td>`)).join("")) : none)}</div>
<div class="grid2c g3">${sec("Meilleurs buteurs", "categories.html", top(p => p.g, ["Joueur", "Cat.", "Buts"], p => `<td>${p.g}</td>`))}${sec("Meilleurs passeurs", "categories.html", top(p => p.a, ["Joueur", "Cat.", "Passes"], p => `<td>${p.a}</td>`))}${sec("Discipline", "categories.html", top(p => p.r * 3 + p.y, ["Joueur", "Cat.", "Jaunes", "Rouges"], p => `<td>${p.y}</td><td>${p.r}</td>`))}</div>
<div class="grid2c">${sec("Installations", "terrains.html", tbl(["Installation", "Surface", "Usage", "Séances", "Heures"], inst))}${sec("Contacts clés", "contacts.html", ct.length ? tbl(["Nom", "Rôle", "Téléphone"], ct.map(x => go("contacts.html", `<td>${esc(x.name)}</td><td>${x.role}</td><td>${tel(x.phone)}</td>`)).join("")) : none)}</div>`;
      main.onclick = e => { const r = e.target.closest("[data-href]"); if (r && !e.target.closest("a")) location.href = r.dataset.href; };
      main.onkeydown = e => { if (e.key === "Enter") { const r = e.target.closest("[data-href]"); if (r) location.href = r.dataset.href; } };
    },
    categories() {
      const qp = new URLSearchParams(location.search), f = { q: "", c: CATS.includes(qp.get("c")) ? qp.get("c") : "Toutes", s: STAT.includes(qp.get("s")) ? qp.get("s") : "Tous", o: "Numéro" };
      const SORT = { "Numéro": (a, b) => a.num - b.num, "Nom": (a, b) => a.name.localeCompare(b.name), "Buts": (a, b) => b.g - a.g, "Passes": (a, b) => b.a - a.a, "Minutes": (a, b) => b.m - a.m };
      main.innerHTML = `<h1>Catégories</h1><div class="bar"><input type="search" id="q" placeholder="Rechercher un joueur" aria-label="Rechercher un joueur"><select id="fc" aria-label="Catégorie"><option>Toutes</option>${opts(CATS, f.c)}</select><select id="fs" aria-label="Statut"><option>Tous</option>${opts(STAT, f.s)}</select><select id="fo" aria-label="Trier par">${opts(Object.keys(SORT))}</select><button class="btn" id="add" type="button">Ajouter un joueur</button></div><p id="count" class="note" role="status"></p><div id="tbl"></div>`;
      const draw = () => {
        const q = norm(f.q), list = P.filter(p => (f.c === "Toutes" || p.cat === f.c) && (f.s === "Tous" || p.status === f.s) && norm(p.name).includes(q)).sort((a, b) => CATS.indexOf(a.cat) - CATS.indexOf(b.cat) || SORT[f.o](a, b) || a.name.localeCompare(b.name));
        $("count").textContent = list.length + " joueur" + (list.length > 1 ? "s" : "");
        $("tbl").innerHTML = list.length ? tbl(["N°", "Joueur", "Poste", "Cat.", "Statut", "Buts", "Passes", "Jaunes", "Rouges", "Min.", ""], list.map(p => `<tr><td>${p.num}</td><td>${esc(p.name)}</td><td>${p.pos}</td><td>${p.cat}</td><td>${bd(p.status)}</td><td>${p.g}</td><td>${p.a}</td><td>${p.y}</td><td>${p.r}</td><td>${p.m}</td><td class="act"><button type="button" class="lnk" data-e="${p.id}">Modifier</button><button type="button" class="lnk del" data-d="${p.id}">Supprimer</button></td></tr>`).join("")) : `<p class="note">Aucun joueur ne correspond à ces filtres.</p>`;
      };
      $("q").addEventListener("input", e => { f.q = e.target.value; draw(); });
      $("fc").addEventListener("change", e => { f.c = e.target.value; draw(); });
      $("fs").addEventListener("change", e => { f.s = e.target.value; draw(); });
      $("fo").addEventListener("change", e => { f.o = e.target.value; draw(); });
      $("add").addEventListener("click", () => {
        const cat = f.c === "Toutes" ? "U6" : f.c, used = new Set(P.filter(p => p.cat === cat).map(p => p.num)); let num = 1; while (used.has(num)) num++;
        dialog("Ajouter un joueur", PF, { cat, status: "Actif", pos: "Non défini", num, g: 0, a: 0, m: 0, y: 0, r: 0 }, vP(null), o => { P.push({ id: nextId(P), ...pl(o) }); saveP(); draw(); toast("Joueur ajouté."); });
      });
      $("tbl").addEventListener("click", e => {
        const b = e.target.closest("button"); if (!b) return;
        const id = +(b.dataset.e ?? b.dataset.d), p = P.find(x => x.id === id); if (!p) return;
        if (b.dataset.e !== undefined) dialog("Modifier le joueur", PF, p, vP(p), o => { Object.assign(p, pl(o)); saveP(); draw(); });
        else if (confirm("Supprimer " + p.name + " ?")) { P.splice(P.indexOf(p), 1); saveP(); purge(id); draw(); }
      });
      draw();
    },
    matchs() {
      main.innerHTML = `<h1>Matchs</h1><div class="bar"><button class="btn" id="add" type="button">Ajouter un match</button></div><p id="sum" class="note" role="status"></p><div id="tbl"></div>`;
      const draw = () => {
        const pd = M.filter(done), c = r => pd.filter(m => res(m) === r).length, t = today();
        $("sum").textContent = pd.length + " joué" + (pd.length > 1 ? "s" : "") + " : " + c("V") + " victoire(s), " + c("N") + " nul(s), " + c("D") + " défaite(s) · " + pd.reduce((s, m) => s + m.sf, 0) + " buts marqués, " + pd.reduce((s, m) => s + m.sa, 0) + " encaissés";
        $("tbl").innerHTML = M.length ? tbl(["Date", "Cat.", "Adversaire", "Compétition", "Lieu", "Score", ""], [...M].sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time)).map(m => `<tr><td>${fdate(m.date)}${m.time ? " " + m.time : ""}</td><td>${m.cat}</td><td>${esc(m.opp)}</td><td>${m.comp}</td><td>${m.home ? "Domicile" : "Extérieur"}</td><td>${done(m) ? `${m.sf} - ${m.sa} ${bd(RB[res(m)]).replace(RB[res(m)] + "</span>", res(m) + "</span>")}` : m.date < t ? "Score à saisir" : "À jouer"}</td><td class="act"><button type="button" class="lnk" data-e="${m.id}">Modifier</button><button type="button" class="lnk del" data-d="${m.id}">Supprimer</button></td></tr>`).join("")) : `<p class="note">Aucun match. Ajoute le premier avec le bouton ci-dessus.</p>`;
      };
      $("add").addEventListener("click", () => dialog("Ajouter un match", MF, { date: today(), time: "", cat: "U13", comp: "Championnat", home: "Domicile", sf: "", sa: "" }, vM(null), o => { M.push({ id: nextId(M), ...ml(o) }); saveM(); draw(); toast("Match ajouté."); }));
      $("tbl").addEventListener("click", e => {
        const b = e.target.closest("button"); if (!b) return;
        const id = +(b.dataset.e ?? b.dataset.d), m = M.find(x => x.id === id); if (!m) return;
        if (b.dataset.e !== undefined) dialog("Modifier le match", MF, { ...m, home: m.home ? "Domicile" : "Extérieur", sf: m.sf ?? "", sa: m.sa ?? "" }, vM(m), o => { Object.assign(m, ml(o)); saveM(); draw(); });
        else if (confirm("Supprimer le match contre " + m.opp + " ?")) { M.splice(M.indexOf(m), 1); saveM(); draw(); }
      });
      draw();
    },
    presences() {
      main.innerHTML = `<h1>Présences</h1><div class="bar"><label>Catégorie <select id="cat">${opts(CATS, store.get("presCat", "U6"))}</select></label><label>Date <input type="date" id="dt" value="${today()}"></label></div><div class="bar"><button class="btn alt" id="all" type="button">Cocher les actifs</button><button class="btn alt" id="none" type="button">Tout décocher</button></div><p id="count" class="note" role="status"></p><div id="list"></div>`;
      const key = () => $("cat").value + "|" + $("dt").value, boxes = () => [...$("list").querySelectorAll("input")];
      const count = () => { $("count").textContent = boxes().filter(i => i.checked).length + " présent(s) sur " + boxes().length; };
      const draw = () => {
        if (!validDate($("dt").value)) { $("list").innerHTML = `<p class="note">Choisis une date valide.</p>`; $("count").textContent = ""; return; }
        store.set("presCat", $("cat").value); const s = new Set(store.get("pres", {})[key()] || []);
        $("list").innerHTML = P.filter(p => p.cat === $("cat").value).sort(byNum).map(p => `<label class="row"><input type="checkbox" data-id="${p.id}" data-s="${p.status}"${s.has(p.id) ? " checked" : ""}>${p.num}. ${esc(p.name)} ${bd(p.status)}</label>`).join("") || `<p class="note">Aucun joueur dans cette catégorie.</p>`;
        count();
      };
      const save = () => { const pr = store.get("pres", {}), ids = boxes().filter(i => i.checked).map(i => +i.dataset.id); if (ids.length) pr[key()] = ids; else delete pr[key()]; store.set("pres", pr); count(); };
      $("cat").addEventListener("change", draw); $("dt").addEventListener("change", draw); $("list").addEventListener("change", save);
      $("all").addEventListener("click", () => { boxes().forEach(i => { i.checked = i.dataset.s === "Actif"; }); save(); });
      $("none").addEventListener("click", () => { boxes().forEach(i => { i.checked = false; }); save(); });
      draw();
    },
    convocations() {
      main.innerHTML = `<h1>Convocations</h1><label class="field">Catégorie<select id="cat">${opts(CATS, store.get("convCat", "U6"))}</select></label><p id="nm" class="note"></p><p id="count" class="note" role="status"></p><div id="list"></div><div class="bar"><button id="copy" class="btn" type="button">Copier la liste</button><button id="clr" class="btn alt" type="button">Tout décocher</button></div><p id="msg" class="note" role="status"></p>`;
      const sel = $("cat"), list = $("list"), say = t => { $("msg").textContent = t; };
      const chosen = () => [...list.querySelectorAll("input:checked")].map(i => +i.dataset.id);
      const nextM = () => M.filter(m => m.cat === sel.value && !done(m) && m.date >= today()).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))[0];
      const update = () => {
        const bx = [...list.querySelectorAll("input")], n = chosen().length;
        bx.forEach(b => { b.disabled = !b.checked && n >= MAX_CONVOC; });
        $("count").textContent = n + " / " + MAX_CONVOC + " convoqués (joueurs actifs uniquement)";
        const cv = store.get("conv", {}); cv[sel.value] = chosen(); store.set("conv", cv);
      };
      const draw = () => {
        store.set("convCat", sel.value); const saved = new Set(store.get("conv", {})[sel.value] || []), m = nextM();
        $("nm").textContent = m ? "Prochain match : " + fdate(m.date) + (m.time ? " " + m.time : "") + " contre " + m.opp + " (" + (m.home ? "domicile" : "extérieur") + ")" : "Aucun match à venir pour cette catégorie.";
        list.innerHTML = P.filter(p => p.cat === sel.value && p.status === "Actif").sort(byNum).map(p => `<label class="row"><input type="checkbox" data-id="${p.id}"${saved.has(p.id) ? " checked" : ""}>${p.num}. ${esc(p.name)} <small>${p.pos}</small></label>`).join("") || `<p class="note">Aucun joueur actif dans cette catégorie.</p>`;
        say(""); update();
      };
      sel.addEventListener("change", draw); list.addEventListener("change", update);
      $("clr").addEventListener("click", () => { list.querySelectorAll("input").forEach(i => { i.checked = false; }); update(); });
      $("copy").addEventListener("click", async () => {
        const names = chosen().map(id => P.find(p => p.id === id)).filter(Boolean).map(p => p.num + ". " + p.name);
        if (!names.length) { say("Coche au moins un joueur."); return; }
        const m = nextM(), txt = "Convocation " + sel.value + (m ? " – " + fdate(m.date) + (m.time ? " " + m.time : "") + " contre " + m.opp + " (" + (m.home ? "domicile" : "extérieur") + ")" : "") + "\n" + names.join("\n");
        try { await navigator.clipboard.writeText(txt); say("Liste copiée."); }
        catch (e) { const t = document.createElement("textarea"); t.value = txt; document.body.appendChild(t); t.select(); let ok = false; try { ok = document.execCommand("copy"); } catch (_) {} t.remove(); say(ok ? "Liste copiée." : "Copie impossible depuis ce navigateur."); }
      });
      draw();
    },
    documents() {
      main.innerHTML = `<h1>Documents</h1><p class="note">Suivi des documents fournis par joueur (les fichiers eux-mêmes ne sont pas stockés ici).</p><label class="field">Catégorie<select id="cat">${opts(CATS, store.get("docCat", "U6"))}</select></label><p id="count" class="note" role="status"></p><div id="tbl"></div>`;
      const cnt = () => { const dc = store.get("docs", {}), L = P.filter(p => p.cat === $("cat").value); $("count").textContent = L.filter(p => (dc[p.id] || []).length === DOCS.length).length + " dossier(s) complet(s) sur " + L.length; };
      const draw = () => {
        const c = $("cat").value, dc = store.get("docs", {}), L = P.filter(p => p.cat === c).sort(byNum); store.set("docCat", c);
        $("tbl").innerHTML = L.length ? tbl(["Joueur", ...DOCS], L.map(p => `<tr><td>${p.num}. ${esc(p.name)}</td>${DOCS.map((d, i) => `<td><input type="checkbox" data-id="${p.id}" data-i="${i}" aria-label="${esc(d)} – ${esc(p.name)}"${(dc[p.id] || []).includes(d) ? " checked" : ""}></td>`).join("")}</tr>`).join("")) : `<p class="note">Aucun joueur dans cette catégorie.</p>`;
        cnt();
      };
      $("cat").addEventListener("change", draw);
      $("tbl").addEventListener("change", e => {
        const i = e.target; if (!i.dataset.id) return;
        const dc = store.get("docs", {}), s = new Set(dc[i.dataset.id] || []), d = DOCS[+i.dataset.i];
        if (i.checked) s.add(d); else s.delete(d); dc[i.dataset.id] = [...s]; store.set("docs", dc); cnt();
      });
      draw();
    },
    terrains() {
      const TF = [{ n: "day", l: "Jour", t: "select", o: DAYS }, { n: "time", l: "Heure de début", t: "time", r: 1 }, { n: "dur", l: "Durée (min)", t: "number", mn: 15, x: 300, r: 1 }, { n: "cat", l: "Catégorie", t: "select", o: CATS }, { n: "venue", l: "Installation", t: "select", o: VENUES.map(v => v.n), w: 1 }];
      const gym = v => v === "Gymnase", u = (c, v) => gym(v) ? 6 : 6 / SPLIT(c), end = t => hm(t.time) + t.dur;
      const place = t => gym(t.venue) ? "Salle entière" : SPLIT(t.cat) === 1 ? "Terrain entier" : "1/" + SPLIT(t.cat) + " de terrain";
      const pt = o => ({ day: o.day, time: o.time, dur: Math.min(Math.max(int(o.dur, 300), 15), 300), cat: o.cat, venue: o.venue });
      const vT = cur => o => {
        const s = hm(o.time); if (s === null) return "Heure invalide.";
        const e = s + Math.min(Math.max(int(o.dur, 300), 15), 300); if (e > 1440) return "L'entraînement doit se terminer avant minuit.";
        const ov = t => t !== cur && t.day === o.day && hm(t.time) < e && end(t) > s;
        const mine = T.find(t => ov(t) && t.cat === o.cat); if (mine) return o.cat + " a déjà un entraînement sur ce créneau (" + mine.venue + ", " + mine.time + ").";
        const same = T.filter(t => ov(t) && t.venue === o.venue), pts = [s, ...same.map(t => hm(t.time)).filter(x => x > s && x < e)];
        if (pts.some(p => u(o.cat, o.venue) + same.filter(t => hm(t.time) <= p && end(t) > p).reduce((a, t) => a + u(t.cat, t.venue), 0) > 6)) return o.venue + " est complet sur ce créneau (" + same.map(t => t.cat).join(", ") + ").";
        return "";
      };
      const grp = []; CATS.forEach(c => { const l = grp[grp.length - 1]; if (l && l.s === SPLIT(c)) l.e = c; else grp.push({ b: c, e: c, s: SPLIT(c) }); });
      main.innerHTML = `<h1>Terrains et entraînements</h1><h2>Installations</h2>${tbl(["Installation", "Surface", "Usage"], VENUES.map(v => `<tr><td>${v.n}</td><td>${v.s}</td><td>${v.g ? "Entraînement uniquement" : "Entraînements et matchs"}</td></tr>`).join(""))}
<h2>Découpage des grands terrains</h2>${tbl(["Catégories", "Place utilisée"], grp.map(g => `<tr><td>${g.b === g.e ? g.b : g.b + " à " + g.e}</td><td>${g.s === 1 ? "Terrain entier" : "1/" + g.s + " de terrain (" + g.s + " groupes en même temps)"}</td></tr>`).join(""))}
<h2>Planning des entraînements</h2><div class="bar"><select id="fv" aria-label="Installation"><option>Toutes</option>${opts(VENUES.map(v => v.n))}</select><button class="btn" id="add" type="button">Ajouter un entraînement</button></div><p id="count" class="note" role="status"></p><div id="tbl"></div>`;
      const draw = () => {
        const L = T.filter(t => $("fv").value === "Toutes" || t.venue === $("fv").value).sort((a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day) || a.time.localeCompare(b.time) || a.venue.localeCompare(b.venue));
        $("count").textContent = L.length + " entraînement" + (L.length > 1 ? "s" : "");
        $("tbl").innerHTML = L.length ? tbl(["Jour", "Horaire", "Cat.", "Installation", "Place", ""], L.map(t => `<tr><td>${t.day}</td><td>${t.time}–${fm(end(t))}</td><td>${t.cat}</td><td>${t.venue}</td><td>${place(t)}</td><td class="act"><button type="button" class="lnk" data-e="${t.id}">Modifier</button><button type="button" class="lnk del" data-d="${t.id}">Supprimer</button></td></tr>`).join("")) : `<p class="note">Aucun entraînement planifié. Ajoute le premier avec le bouton ci-dessus.</p>`;
      };
      $("fv").addEventListener("change", draw);
      $("add").addEventListener("click", () => dialog("Ajouter un entraînement", TF, { day: "Lundi", time: "18:00", dur: 90, cat: "U13", venue: VENUES[0].n }, vT(null), o => { T.push({ id: nextId(T), ...pt(o) }); saveT(); draw(); toast("Entraînement ajouté."); }));
      $("tbl").addEventListener("click", e => {
        const b = e.target.closest("button"); if (!b) return;
        const id = +(b.dataset.e ?? b.dataset.d), t = T.find(x => x.id === id); if (!t) return;
        if (b.dataset.e !== undefined) dialog("Modifier l'entraînement", TF, t, vT(t), o => { Object.assign(t, pt(o)); saveT(); draw(); });
        else if (confirm("Supprimer cet entraînement (" + t.cat + ", " + t.day + " " + t.time + ") ?")) { T.splice(T.indexOf(t), 1); saveT(); draw(); }
      });
      draw();
    },
    contacts() {
      const CF = [{ n: "name", l: "Nom", t: "text", r: 1, w: 1 }, { n: "role", l: "Rôle", t: "select", o: ROLES }, { n: "cat", l: "Catégorie", t: "select", o: ["Toutes", ...CATS] }, { n: "phone", l: "Téléphone", t: "tel" }, { n: "email", l: "E-mail", t: "email" }];
      const dg = s => String(s).replace(/\D/g, ""), pc = o => ({ name: sp(o.name), role: o.role, cat: o.cat === "Toutes" ? "" : o.cat, phone: sp(o.phone), email: sp(o.email) });
      const vC = cur => o => {
        const n = norm(o.name), ph = sp(o.phone), em = sp(o.email);
        if (!n) return "Le nom est obligatoire."; if (!ph && !em) return "Renseigne un téléphone ou un e-mail.";
        if (ph && (!PH.test(ph) || dg(ph).length < 2 || dg(ph).length > 15)) return "Numéro de téléphone invalide."; if (em && !EM.test(em)) return "Adresse e-mail invalide.";
        const d = C.find(c => c !== cur && ((norm(c.name) === n && c.role === o.role) || (ph && c.phone && dg(c.phone) === dg(ph)) || (em && c.email && c.email.toLowerCase() === em.toLowerCase())));
        return d ? "Ce contact existe déjà (« " + d.name + " »)." : "";
      };
      const f = { q: "", r: "Tous", c: "Toutes" };
      main.innerHTML = `<h1>Contacts</h1><div class="bar"><input type="search" id="q" placeholder="Rechercher un contact" aria-label="Rechercher un contact"><select id="fr" aria-label="Rôle"><option>Tous</option>${opts(ROLES)}</select><select id="fc" aria-label="Catégorie"><option>Toutes</option>${opts(CATS)}</select><button class="btn" id="add" type="button">Ajouter un contact</button></div><p id="count" class="note" role="status"></p><div id="tbl"></div>`;
      const draw = () => {
        const q = norm(f.q), L = C.filter(c => (f.r === "Tous" || c.role === f.r) && (f.c === "Toutes" || !c.cat || c.cat === f.c) && norm(c.name + " " + c.role).includes(q)).sort((a, b) => ROLES.indexOf(a.role) - ROLES.indexOf(b.role) || a.name.localeCompare(b.name));
        $("count").textContent = L.length + " contact" + (L.length > 1 ? "s" : "");
        $("tbl").innerHTML = L.length ? tbl(["Nom", "Rôle", "Cat.", "Téléphone", "E-mail", ""], L.map(c => `<tr><td>${esc(c.name)}</td><td>${c.role}</td><td>${c.cat || "Toutes"}</td><td>${c.phone ? `<a href="tel:${esc(c.phone.replace(/[^\d+]/g, ""))}">${esc(c.phone)}</a>` : ""}</td><td>${c.email ? `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : ""}</td><td class="act"><button type="button" class="lnk" data-e="${c.id}">Modifier</button><button type="button" class="lnk del" data-d="${c.id}">Supprimer</button></td></tr>`).join("")) : `<p class="note">Aucun contact ne correspond.</p>`;
      };
      $("q").addEventListener("input", e => { f.q = e.target.value; draw(); });
      $("fr").addEventListener("change", e => { f.r = e.target.value; draw(); });
      $("fc").addEventListener("change", e => { f.c = e.target.value; draw(); });
      $("add").addEventListener("click", () => dialog("Ajouter un contact", CF, { role: "Entraîneur", cat: "Toutes", phone: "", email: "" }, vC(null), o => { C.push({ id: nextId(C), ...pc(o) }); saveC(); draw(); toast("Contact ajouté."); }));
      $("tbl").addEventListener("click", e => {
        const b = e.target.closest("button"); if (!b) return;
        const id = +(b.dataset.e ?? b.dataset.d), c = C.find(x => x.id === id); if (!c) return;
        if (b.dataset.e !== undefined) dialog("Modifier le contact", CF, { ...c, cat: c.cat || "Toutes" }, vC(c), o => { Object.assign(c, pc(o)); saveC(); draw(); });
        else if (confirm("Supprimer " + c.name + " ?")) { C.splice(C.indexOf(c), 1); saveC(); draw(); }
      });
      draw();
    },
    parametres() {
      main.innerHTML = `<h1>Paramètres</h1><label class="field">Nom du club<input type="text" id="club" maxlength="40"></label><button id="save" class="btn" type="button">Enregistrer</button> <button id="reset" class="btn alt" type="button">Réinitialiser les données</button><p id="msg" class="note" role="status"></p>`;
      $("club").value = club;
      $("save").addEventListener("click", () => { const v = sp($("club").value) || DEF_CLUB; if (store.set("club", v)) { $("logo").textContent = v; $("navname").textContent = v; $("msg").textContent = "Enregistré sur cet appareil."; } });
      $("reset").addEventListener("click", () => { if (confirm("Remplacer tous les joueurs, matchs, présences, convocations et documents par les données d'exemple ?")) { ["players", "matches", "pres", "conv", "docs", "trainings", "contacts"].forEach(k => store.del(k)); loadAll(true); $("msg").textContent = "Données réinitialisées."; } });
    },
    export() {
      main.innerHTML = `<h1>Export</h1><p class="note">Fichiers CSV lisibles dans Excel, et sauvegarde complète au format JSON.</p><div class="bar"><button id="dp" class="btn" type="button">Joueurs (CSV)</button><button id="dm" class="btn" type="button">Matchs (CSV)</button><button id="dr" class="btn" type="button">Présences (CSV)</button><button id="dt" class="btn" type="button">Entraînements (CSV)</button><button id="dc" class="btn" type="button">Contacts (CSV)</button><button id="dj" class="btn alt" type="button">Sauvegarde (JSON)</button></div><h2>Restaurer une sauvegarde</h2><input type="file" id="imp" accept=".json,application/json" aria-label="Fichier de sauvegarde"><p id="msg" class="note" role="status"></p>`;
      const idn = id => (P.find(p => p.id === id) || {}).name;
      $("dp").addEventListener("click", () => download("joueurs.csv", csv([["Catégorie", "N°", "Joueur", "Poste", "Statut", "Buts", "Passes", "Jaunes", "Rouges", "Minutes"], ...P.map(p => [p.cat, p.num, p.name, p.pos, p.status, p.g, p.a, p.y, p.r, p.m])]), "text/csv", 1));
      $("dm").addEventListener("click", () => download("matchs.csv", csv([["Date", "Heure", "Catégorie", "Compétition", "Adversaire", "Lieu", "Nos buts", "Buts adverses"], ...M.map(m => [m.date, m.time, m.cat, m.comp, m.opp, m.home ? "Domicile" : "Extérieur", m.sf ?? "", m.sa ?? ""])]), "text/csv", 1));
      $("dr").addEventListener("click", () => { const pr = store.get("pres", {}), rows = []; Object.keys(pr).sort().forEach(k => { const [c, d] = k.split("|"); pr[k].forEach(id => { if (idn(id)) rows.push([d, c, idn(id)]); }); }); download("presences.csv", csv([["Date", "Catégorie", "Joueur"], ...rows]), "text/csv", 1); });
      $("dt").addEventListener("click", () => download("entrainements.csv", csv([["Jour", "Début", "Durée (min)", "Catégorie", "Installation"], ...T.map(t => [t.day, t.time, t.dur, t.cat, t.venue])]), "text/csv", 1));
      $("dc").addEventListener("click", () => download("contacts.csv", csv([["Nom", "Rôle", "Catégorie", "Téléphone", "E-mail"], ...C.map(c => [c.name, c.role, c.cat || "Toutes", c.phone, c.email])]), "text/csv", 1));
      $("dj").addEventListener("click", () => download("sauvegarde-" + today() + ".json", JSON.stringify({ v: 2, club, players: P, matches: M, trainings: T, contacts: C, pres: store.get("pres", {}), conv: store.get("conv", {}), docs: store.get("docs", {}) }, null, 1), "application/json", 0));
      $("imp").addEventListener("change", async e => {
        const file = e.target.files[0]; if (!file) return;
        try {
          const j = JSON.parse(await file.text()); if (!Array.isArray(j.players) || !Array.isArray(j.matches)) throw 0;
          if (!confirm("Remplacer toutes les données actuelles par cette sauvegarde ?")) { e.target.value = ""; return; }
          store.set("players", j.players.map(cleanP)); store.set("matches", j.matches.map(cleanM)); store.set("trainings", Array.isArray(j.trainings) ? j.trainings.map(cleanT) : []); store.set("contacts", Array.isArray(j.contacts) ? j.contacts.map(cleanC) : seedContacts());
          ["pres", "conv", "docs"].forEach(k => store.set(k, j[k] && typeof j[k] === "object" && !Array.isArray(j[k]) ? j[k] : {}));
          if (typeof j.club === "string") store.set("club", sp(j.club).slice(0, 40) || DEF_CLUB);
          location.reload();
        } catch (_) { $("msg").textContent = "Fichier invalide."; e.target.value = ""; }
      });
    }
  };
  if (pages[page]) pages[page]();
  // Mise en cache pour utilisation hors connexion (PWA)
  if ("serviceWorker" in navigator && location.protocol === "https:") {
    window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}), { once: true });
  }
  // Synchronisation entre onglets
  window.addEventListener("storage", e => { if (e.storageArea === localStorage && pages[page]) { loadAll(false); pages[page](); } });
}
  // Installation PWA, état réseau et rappel du stockage local.
  (function setupPWA() {
    const meta = document.createElement("meta");
    meta.name = "theme-color"; meta.content = "#2FAEE0"; document.head.appendChild(meta);
    const manifest = document.createElement("link");
    manifest.rel = "manifest"; manifest.href = "manifest.webmanifest"; document.head.appendChild(manifest);
    const apple = document.createElement("meta");
    apple.name = "apple-mobile-web-app-capable"; apple.content = "yes"; document.head.appendChild(apple);
    function status() {
      let bar = $("app-status");
      if (!bar) {
        bar = document.createElement("div"); bar.id = "app-status";
        bar.setAttribute("role", "status"); bar.style.cssText =
          "position:fixed;bottom:0;left:0;right:0;z-index:90;padding:7px 12px;text-align:center;font:12px system-ui;background:#eef7fb;color:#24546b;border-top:1px solid #d5e8f1";
        document.body.appendChild(bar);
      }
      bar.textContent = (navigator.onLine ? "En ligne" : "Hors ligne") + " · Données enregistrées sur cet appareil";
    }
    window.addEventListener("online", status);
    window.addEventListener("offline", status);
    status();
    if ("serviceWorker" in navigator && location.protocol !== "file:") {
      window.addEventListener("load", () => navigator.serviceWorker.register("./service-worker.js")
        .catch(error => console.warn("Mode hors ligne indisponible :", error)));
    }
  })();
