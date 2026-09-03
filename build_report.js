const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, ImageRun,
  Table, TableRow, TableCell, WidthType, ShadingType, AlignmentType,
  BorderStyle, Header, Footer, PageNumber, Tab, VerticalAlign,
} = require("docx");

const CHARTS = path.join(__dirname, "charts");
const DATA = JSON.parse(fs.readFileSync(path.join(__dirname, "data.json"), "utf-8"));
const SUMMARY = DATA.summary;
const SCENARIOS = DATA.scenarios;
const PRICES = DATA.scenario_prices;

const NAVY = "1a2b4c";
const ACCENT = "b3261e";
const GREEN = "1f7a4d";
const GREY = "555555";
const LIGHT = "F4F5F7";

// ---------- helpers ----------
function h1(text, num) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 160 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: NAVY, space: 4 } },
    children: [new TextRun({ text: (num ? num + ". " : "") + text, bold: true, color: NAVY, size: 30 })],
  });
}
function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 120 },
    children: [new TextRun({ text, bold: true, color: ACCENT, size: 23 })],
  });
}
function h3(text) {
  return new Paragraph({
    spacing: { before: 160, after: 80 },
    children: [new TextRun({ text, bold: true, color: NAVY, size: 20, italics: true })],
  });
}
function body(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 140, line: 300 },
    alignment: AlignmentType.JUSTIFIED,
    children: [new TextRun({ text, size: 20, ...opts })],
  });
}
function bullet(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 70, line: 280 },
    bullet: { level: 0 },
    children: [new TextRun({ text, size: 20, ...opts })],
  });
}
function calloutBox(text, color = NAVY) {
  return new Table({
    width: { size: 9000, type: WidthType.DXA },
    rows: [new TableRow({
      children: [new TableCell({
        width: { size: 9000, type: WidthType.DXA },
        shading: { type: ShadingType.CLEAR, fill: LIGHT },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 16, color },
          bottom: { style: BorderStyle.SINGLE, size: 2, color: "DDDDDD" },
          left: { style: BorderStyle.SINGLE, size: 16, color },
          right: { style: BorderStyle.SINGLE, size: 2, color: "DDDDDD" },
        },
        margins: { top: 140, bottom: 140, left: 200, right: 200 },
        children: [new Paragraph({ children: [new TextRun({ text, size: 19, italics: true, color: "333333" })], spacing: { line: 280 } })],
      })],
    })],
  });
}
function img(file, widthPx, caption) {
  const data = fs.readFileSync(path.join(CHARTS, file));
  const w = widthPx;
  const h = Math.round(widthPx * 0.62);
  const children = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 100, after: 60 },
      children: [new ImageRun({ data, transformation: { width: w, height: h }, type: "png" })],
    }),
  ];
  if (caption) {
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 180 },
      children: [new TextRun({ text: caption, size: 16, italics: true, color: GREY })],
    }));
  }
  return children;
}

function styledTable(headers, rows, colWidths, options = {}) {
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map((htext, i) => new TableCell({
      width: { size: colWidths[i], type: WidthType.DXA },
      shading: { type: ShadingType.CLEAR, fill: NAVY },
      verticalAlign: VerticalAlign.CENTER,
      margins: { top: 80, bottom: 80, left: 90, right: 90 },
      children: [new Paragraph({ children: [new TextRun({ text: htext, bold: true, color: "FFFFFF", size: options.fontSize || 16 })] })],
    })),
  });

  const bodyRows = rows.map((r, idx) => new TableRow({
    children: r.map((val, i) => {
      let color = "1a1a1a";
      let bold = false;
      if (options.highlightNegative && typeof val === "string" && val.trim().startsWith("-")) color = ACCENT;
      if (options.highlightFirstCol && i === 0) bold = true;
      return new TableCell({
        width: { size: colWidths[i], type: WidthType.DXA },
        shading: { type: ShadingType.CLEAR, fill: idx % 2 === 0 ? LIGHT : "FFFFFF" },
        verticalAlign: VerticalAlign.CENTER,
        margins: { top: 70, bottom: 70, left: 90, right: 90 },
        children: [new Paragraph({ children: [new TextRun({ text: String(val), size: options.fontSize || 16, color, bold })] })],
      });
    }),
  }));

  return new Table({
    width: { size: colWidths.reduce((a, b) => a + b, 0), type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [headerRow, ...bodyRows],
  });
}

function pnlCell(v) {
  const n = parseFloat(v);
  return (n >= 0 ? "+" : "") + n.toFixed(1) + "$";
}

// ---------- Section 5 : matrice de scénarios ----------
function scenarioTable() {
  const headers = ["Stratégie", ...PRICES.map((p) => `${p}$`)];
  const colWidths = [2400, ...PRICES.map(() => (9000 - 2400) / PRICES.length)];
  const rows = SCENARIOS.map((s) => [s["Stratégie"], ...s.pnl.map(pnlCell)]);
  return styledTable(headers, rows, colWidths, { highlightNegative: true, highlightFirstCol: true, fontSize: 15 });
}

function summaryTable() {
  const headers = ["Stratégie", "Vue de marché", "Prime nette", "Breakeven", "Gain max", "Perte max", "Ratio R/R"];
  const colWidths = [1500, 2300, 1300, 1300, 900, 900, 800];
  const rows = SUMMARY.map((r) => [
    r["Stratégie"], r["Vue de marché"], r["Prime nette"], r["Breakeven(s)"], r["Gain max"], r["Perte max"], r["Ratio R/R"],
  ]);
  return styledTable(headers, rows, colWidths, { highlightNegative: false, highlightFirstCol: true, fontSize: 14 });
}

function findRow(name) {
  return SUMMARY.find((r) => r["Stratégie"] === name);
}

// ---------- assemblage du document ----------
const children = [];

// ---- Page de garde ----
children.push(
  new Paragraph({ spacing: { before: 1600 }, children: [] }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 100 },
    children: [new TextRun({ text: "ANALYSE QUANTITATIVE", size: 20, color: ACCENT, bold: true, characterSpacing: 20 })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
    children: [new TextRun({ text: "Stratégies optionnelles appliquées au marché pétrolier", bold: true, size: 46, color: NAVY })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 500 },
    children: [new TextRun({ text: "Payoffs, points morts et lecture de marché — Brent Crude Oil, contexte de tension géopolitique Moyen-Orient", size: 24, color: GREY, italics: true })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 60 },
    children: [new TextRun({ text: "Septembre 2026", size: 20, color: GREY })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 900 },
    children: [new TextRun({ text: "Base théorique : J. Hull, Options, Futures and Other Derivatives — Chapitre 11", size: 18, color: GREY })],
  }),
);

// Sommaire (manuel, sans champ TOC auto)
children.push(
  calloutBox(
    "Sommaire  —  1. Contexte de marché  ·  2. Méthodologie et hypothèses  ·  3. Analyse détaillée des 6 stratégies  ·  " +
    "4. Tableau de synthèse quantitatif  ·  5. Analyse de scénarios  ·  6. Grille de décision  ·  7. Limites et prolongements",
    NAVY
  ),
  new Paragraph({ children: [], pageBreakBefore: true }),
);

// ---- 1. Contexte ----
children.push(
  h1("Contexte de marché", 1),
  body(
    "Depuis fin août 2026, le marché pétrolier traverse l'un de ses épisodes de tension les plus marqués depuis plusieurs années. " +
    "L'escalade militaire entre les États-Unis et l'Iran — frappes ciblées sur des capacités stratégiques iraniennes et menaces récurrentes " +
    "sur la libre circulation dans le détroit d'Ormuz, point de passage d'environ un cinquième du pétrole mondial — a fait bondir le Brent " +
    "au-dessus de 90 $/baril, avec des séances affichant des variations de plus de 4 % en une journée."
  ),
  body(
    "Ce choc s'inscrit dans un contexte déjà chargé : les décisions de l'OPEP+ sur les niveaux de production, la pression politique aux " +
    "États-Unis à l'approche des élections de mi-mandat de novembre 2026 (le niveau des prix à la pompe restant un sujet sensible pour " +
    "l'administration), et une demande mondiale encore incertaine, contribuent à une volatilité implicite durablement élevée sur les " +
    "options pétrolières. C'est précisément ce type d'environnement — où la direction du marché est difficile à anticiper mais où l'amplitude " +
    "du mouvement à venir semble acquise — qui rend les stratégies optionnelles particulièrement pertinentes, au-delà du simple pari " +
    "directionnel sur futures."
  ),
  calloutBox(
    "Pourquoi les options plutôt qu'une position simple sur futures ? Une position longue ou courte sur futures est un pari binaire sur la " +
    "direction. Les options permettent de découpler la vue sur la direction de la vue sur l'amplitude (volatilité), et de calibrer précisément " +
    "le couple risque/rendement recherché — ce qui est exactement l'objet de ce rapport.",
    ACCENT
  ),
);

// ---- 2. Méthodologie ----
children.push(
  h1("Méthodologie et hypothèses", 2),
  body(
    "L'analyse repose sur le cadre théorique du chapitre 11 de Hull consacré aux stratégies de trading sur options : construction de " +
    "positions composées à partir d'options vanilles (calls et puts), calcul du profil de profit et perte (P&L) à l'échéance, et identification " +
    "des points morts (breakeven). Le sous-jacent retenu est le Brent Crude Oil, avec un spot de référence fixé à 90 $/baril."
  ),
  body("Plusieurs simplifications, assumées et documentées, permettent de rester fidèle à l'esprit pédagogique du chapitre 11 :"),
  bullet("Options de style européen, exercice uniquement à l'échéance — pas d'exercice anticipé à modéliser."),
  bullet("Primes approximées manuellement de façon à refléter un marché en volatilité implicite élevée (plus la stratégie est éloignée de la monnaie, plus la prime est faible), et non calibrées via un modèle de pricing (Black-Scholes ou arbre binomial)."),
  bullet("Aucun coût de transaction, de marge ou de financement n'est pris en compte."),
  bullet("Le P&L est calculé à une échéance unique : aucune dynamique temporelle (theta) n'est modélisée avant cette date."),
  body(
    "Pour chaque stratégie, quatre indicateurs quantitatifs sont systématiquement calculés : le ou les points morts (en valeur absolue et en " +
    "pourcentage de variation par rapport au spot), le gain maximal, la perte maximale, et un ratio risque/rendement (gain max rapporté à la " +
    "perte max) lorsque celui-ci est défini. Ces calculs sont entièrement automatisés en Python (voir section 7 et le dépôt GitHub associé)."
  ),
);

// ---- 3. Analyse détaillée ----
children.push(h1("Analyse détaillée des stratégies", 3));

// 3.1 Straddle
children.push(
  h2("3.1 Long Straddle — parier sur l'amplitude, pas sur la direction"),
  body(
    "Le straddle consiste à acheter simultanément un call et un put au même strike (ici 90, c'est-à-dire à la monnaie). C'est la stratégie " +
    "de référence lorsqu'un trader anticipe un mouvement violent du Brent sans avoir de conviction sur son sens — un scénario tout à fait " +
    "cohérent avec la situation actuelle : une nouvelle escalade militaire pousserait le prix nettement au-dessus de 100$, tandis qu'une " +
    "annonce surprise de désescalade ou d'accord diplomatique pourrait le faire retomber rapidement sous 80$."
  ),
  ...img("long_straddle.png", 480),
  body(
    `Avec une prime totale de ${findRow("Long Straddle")["Prime nette"]}, la position devient profitable dès que le Brent sort du corridor ` +
    `${findRow("Long Straddle")["Breakeven(s)"]} (soit un mouvement d'au moins ${findRow("Long Straddle")["Breakeven (% vs spot)"].split(",")[1].trim()} dans un sens ou l'autre). ` +
    "Le risque est strictement limité à la prime payée, tandis que le potentiel de gain à la hausse est théoriquement illimité (porté par le call). " +
    "Le principal inconvénient reste le coût d'entrée élevé : c'est la stratégie la plus chère du panel étudié, ce qui est le prix à payer pour " +
    "une exposition pure à la volatilité, sans aucun pari directionnel."
  ),
);

// 3.2 Strangle
children.push(
  h2("3.2 Long Strangle — la même vue, moins chère"),
  body(
    "Le strangle reprend la même logique que le straddle — parier sur l'amplitude plutôt que sur la direction — mais en écartant les strikes " +
    "du call et du put (respectivement 95 et 85 ici). Cela réduit mécaniquement le coût de la position, au prix d'une zone de perte plus large : " +
    "le Brent doit désormais bouger davantage pour que la position devienne gagnante."
  ),
  ...img("long_strangle.png", 480),
  body(
    `Le coût d'entrée tombe à ${findRow("Long Strangle")["Prime nette"]}, contre 8,20$ pour le straddle, soit une économie d'environ 43 %. ` +
    `En contrepartie, les points morts s'écartent à ${findRow("Long Strangle")["Breakeven(s)"]}. Ce compromis est pertinent pour un trader ` +
    "convaincu qu'un mouvement fort est à venir, mais qui souhaite limiter son exposition en cas de scénario de statu quo prolongé — un " +
    "risque non négligeable si les négociations diplomatiques traînent en longueur sans dénouement clair."
  ),
);

// 3.3 Bull call spread
children.push(
  h2("3.3 Bull Call Spread — capter la hausse à moindre coût"),
  body(
    "Le bull call spread combine l'achat d'un call à la monnaie (K=90) et la vente d'un call hors de la monnaie (K=100). Il exprime une " +
    "conviction haussière modérée : le trader anticipe une poursuite des tensions géopolitiques et donc une hausse du Brent, mais ne " +
    "s'attend pas (ou ne souhaite pas parier sur) une envolée au-delà de 100$."
  ),
  ...img("bull_call_spread.png", 480),
  body(
    `La vente du call à 100 finance une partie de l'achat du call à 90, ramenant le coût net à ${findRow("Bull Call Spread")["Prime nette"]} ` +
    `— un montant très inférieur au straddle. Le point mort se situe à ${findRow("Bull Call Spread")["Breakeven(s)"]} ` +
    `(soit ${findRow("Bull Call Spread")["Breakeven (% vs spot)"]} par rapport au spot), et le gain est plafonné à 7,40$, atteint dès que le ` +
    `Brent dépasse 100$. Le ratio risque/rendement de ${findRow("Bull Call Spread")["Ratio R/R"]} en fait l'une des structures les plus ` +
    "efficientes du panel pour une vue directionnelle mesurée."
  ),
);

// 3.4 Bear put spread
children.push(
  h2("3.4 Bear Put Spread — le symétrique baissier"),
  body(
    "Symétrique du bull call spread, le bear put spread associe l'achat d'un put à la monnaie (K=90) et la vente d'un put hors de la monnaie " +
    "(K=80). Il correspond à un scénario de désescalade : reprise de négociations, signal d'apaisement de la part de l'Iran ou intervention " +
    "diplomatique tierce (l'Arabie Saoudite ou les pays du Golfe, par exemple) faisant refluer la prime de risque géopolitique."
  ),
  ...img("bear_put_spread.png", 480),
  body(
    `Le profil est quasiment miroir du bull call spread : coût net de ${findRow("Bear Put Spread")["Prime nette"]}, point mort à ` +
    `${findRow("Bear Put Spread")["Breakeven(s)"]} (${findRow("Bear Put Spread")["Breakeven (% vs spot)"]}), gain plafonné à 7,30$ et ratio ` +
    `risque/rendement de ${findRow("Bear Put Spread")["Ratio R/R"]}. Le choix entre bull call spread et bear put spread dépend donc uniquement ` +
    "de la conviction directionnelle du trader, les deux structures offrant un couple risque/rendement très comparable."
  ),
);

// 3.5 Butterfly
children.push(
  h2("3.5 Long Butterfly — parier sur le statu quo"),
  body(
    "Le butterfly (achat d'un call à 80, vente de deux calls à 90, achat d'un call à 100) est la seule stratégie du panel qui parie explicitement " +
    "sur une stabilisation du marché. Elle serait pertinente si, après le choc initial, le Brent entrait dans une phase de consolidation autour " +
    "de 90$ — par exemple si les deux camps s'installaient dans un conflit de basse intensité sans nouvelle escalade ni résolution rapide."
  ),
  ...img("long_butterfly.png", 480),
  body(
    `Pour un coût modéré de ${findRow("Long Butterfly")["Prime nette"]}, la zone de profit s'étend de ` +
    `${findRow("Long Butterfly")["Breakeven(s)"]} (soit ${findRow("Long Butterfly")["Breakeven (% vs spot)"]}), avec un gain maximal atteint ` +
    "précisément au strike central (90). C'est la structure la plus fine du panel : elle nécessite une conviction précise sur le niveau de " +
    "stabilisation, et son ratio risque/rendement proche de 1 reflète cette exigence de précision."
  ),
);

// 3.6 Collar
children.push(
  h2("3.6 Collar — la logique de couverture d'un producteur"),
  body(
    "Le collar change de perspective : il ne s'agit plus d'un pari spéculatif mais d'une couverture. Il suppose une position longue " +
    "préexistante sur le brut physique (typique d'un producteur, d'une compagnie aérienne cherchant à couvrir sa consommation, ou d'un " +
    "trader détenant du papier), complétée par l'achat d'un put de protection (K=85) financé par la vente d'un call (K=95)."
  ),
  ...img("collar_couverture.png", 480),
  body(
    `Point notable : la vente du call finance quasi intégralement l'achat du put, générant même un léger crédit net de ` +
    `${findRow("Collar (couverture)")["Prime nette"]}. C'est ce qu'on appelle un « zero-cost collar » (ou quasi zero-cost ici). En contrepartie, ` +
    "le producteur renonce à tout gain au-delà de 95$ : il échange une partie de son potentiel de hausse contre une protection gratuite sur " +
    "sa baisse. Dans le contexte actuel, où la volatilité rend les primes d'options élevées des deux côtés, cette structure est particulièrement " +
    "attractive pour un acteur industriel qui cherche avant tout à sécuriser un niveau de marge, pas à spéculer sur la direction du marché."
  ),
);

// ---- 4. Tableau de synthèse ----
children.push(
  h1("Tableau de synthèse quantitatif", 4),
  body("Vue d'ensemble des six stratégies, avec leur coût d'entrée, leurs points morts et leur profil risque/rendement."),
  summaryTable(),
  new Paragraph({ spacing: { before: 140, after: 200 }, children: [new TextRun({
    text: "Note méthodologique : pour le Straddle et le Strangle, le gain maximal affiché est numériquement borné par la grille de calcul " +
      "(140$) — en théorie, le potentiel de hausse est illimité puisqu'il est porté par un call long non couvert. Le ratio risque/rendement " +
      "n'est donc pas défini pour ces deux stratégies (indiqué « Illimité »).",
    size: 16, italics: true, color: GREY,
  })] }),
);

// ---- 5. Scénarios ----
children.push(
  h1("Analyse de scénarios", 5),
  body(
    "Au-delà des indicateurs synthétiques (breakeven, gain/perte max), il est utile de visualiser directement le P&L de chaque stratégie pour " +
    "une série de niveaux de prix du Brent à l'échéance. Le tableau ci-dessous permet de comparer, scénario par scénario, la performance " +
    "des six structures — et met en évidence qu'aucune stratégie ne domine dans tous les cas de figure : le choix dépend entièrement de la " +
    "conviction (ou de l'absence de conviction directionnelle) du trader."
  ),
  scenarioTable(),
  body(
    "Trois lectures se dégagent de cette matrice. D'abord, en cas de choc extrême (70$ ou 120$), le straddle et le strangle dominent " +
    "largement toutes les autres structures — logique, puisque ce sont les seules à profil de gain non plafonné. Ensuite, autour du spot " +
    "(85-95$), ce sont au contraire les structures à prime réduite (spreads, butterfly, collar) qui limitent le mieux la casse, le straddle et " +
    "le strangle étant pénalisés par leur coût d'entrée élevé. Enfin, le collar affiche la variance la plus faible de l'ensemble du panel : " +
    "c'est précisément sa fonction, puisqu'il s'agit d'un outil de couverture et non de spéculation.",
    { size: 20 }
  ),
);

// ---- 6. Grille de décision ----
children.push(
  h1("Grille de décision", 6),
  body("En synthèse, le choix d'une stratégie dépend avant tout de la vue de marché et du niveau de conviction du trader :"),
  bullet("Conviction sur l'amplitude, aucune conviction directionnelle, budget confortable → Long Straddle."),
  bullet("Même conviction, budget de prime plus serré → Long Strangle."),
  bullet("Conviction haussière modérée (poursuite des tensions sans envolée) → Bull Call Spread."),
  bullet("Conviction baissière modérée (désescalade partielle) → Bear Put Spread."),
  bullet("Conviction précise sur un niveau de stabilisation → Long Butterfly."),
  bullet("Détention physique du sous-jacent, besoin de sécuriser une marge sans capital immobilisé → Collar."),
);

// ---- 7. Limites ----
children.push(
  h1("Limites du modèle et prolongements possibles", 7),
  bullet("Primes approximées manuellement, non calibrées sur une surface de volatilité implicite réelle observée sur le marché des options Brent (ICE)."),
  bullet("Échéance unique modélisée — aucune dynamique de theta ou de delta avant l'échéance n'est prise en compte."),
  bullet("Absence de coûts de transaction, de marge initiale ou de financement, qui affecteraient en pratique la rentabilité nette de chaque structure."),
  bullet("Prolongement naturel et déjà identifié : le chapitre 12 de Hull (arbres binomiaux) permettrait de remplacer les primes approximées par un pricing théorique cohérent, sensible à la volatilité et au temps restant avant échéance."),
  bullet("Autre prolongement possible : intégrer les Greeks (delta, gamma, vega) pour quantifier plus finement l'exposition de chaque structure à un choc de volatilité plutôt qu'à un simple mouvement de prix à l'échéance."),
  body(
    "L'ensemble du code Python (fonctions de payoff, composition des stratégies, calcul des indicateurs et génération des graphiques) est " +
    "disponible en open source sur GitHub, avec un README détaillant la structure du projet et les instructions d'exécution."
  ),
  new Paragraph({ spacing: { before: 300 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: "— Fin du rapport —", italics: true, color: GREY, size: 18 })] }),
);

// ---------- document ----------
const doc = new Document({
  sections: [{
    properties: {
      page: {
        size: { width: 11906, height: 16838 },
        margin: { top: 1200, bottom: 1000, left: 1100, right: 1100 },
      },
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "DDDDDD", space: 4 } },
          children: [new TextRun({ text: "Stratégies optionnelles — Marché pétrolier (Brent)", size: 15, color: GREY, italics: true })],
        })],
      }),
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: "Page ", size: 15, color: GREY }),
            new TextRun({ children: [PageNumber.CURRENT], size: 15, color: GREY }),
            new TextRun({ text: " / ", size: 15, color: GREY }),
            new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 15, color: GREY }),
          ],
        })],
      }),
    },
    children,
  }],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(path.join(__dirname, "Rapport_Strategies_Options_Brent.docx"), buf);
  console.log("docx v2 written");
});
