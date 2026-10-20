const API = 'api.php';
const DEVISE = 'FCFA';       // Changez la devise ici (ex. '€', 'USD')
const SEUIL_ALERTE = 5;      // Reste (en unités) en dessous duquel la ligne est signalée

const $ = (id) => document.getElementById(id);
const corps = $('corps'), vide = $('vide'), modal = $('modal'), form = $('form');
let produits = [];

/* ---------- Calculs ----------
   - prix_achat   = prix d'un LOT entier (casier, pack...)
   - prix_unitaire = prix de vente d'UNE unité
   - les quantités sont comptées en unités                                 */
const arrondi = (n) => Math.round(n * 100) / 100;
const lot = (p) => Math.max(1, Number(p.unites_par_lot) || 1);
const coutUnitaire = (p) => arrondi(p.prix_achat / lot(p));
const beneficeUnitaire = (p) => arrondi(p.prix_unitaire - p.prix_achat / lot(p));
const beneficePotentiel = (p) => arrondi(p.reste * beneficeUnitaire(p));          // sur le stock restant
const beneficeRealise = (p) => arrondi(p.quantite_sortie * beneficeUnitaire(p));  // sur ce qui est déjà vendu
const valeurStock = (p) => arrondi(p.reste * p.prix_unitaire);                    // reste × prix unitaire
const somme = (fn) => arrondi(produits.reduce((s, p) => s + fn(p), 0));

/* ---------- Utilitaires ---------- */
const nombre = (n) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(n);
// Le PDF (police Helvetica) n'affiche pas les espaces insécables fines : on les remplace
const nombrePdf = (n) => nombre(n).replace(/[\u202f\u00a0]/g, ' ');
const echapper = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&', '<': '<', '>': '>', '"': '"', "'": '&#39;' }[c]));
const classeBenefice = (n) => (n < 0 ? 'perte' : n > 0 ? 'gain' : '');

function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('visible');
  setTimeout(() => t.classList.remove('visible'), 2400);
}

async function appel(url, options = {}) {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Une erreur est survenue.');
  return json;
}

/* ---------- Lecture et affichage ---------- */
async function charger() {
  try {
    const q = encodeURIComponent($('recherche').value.trim());
    const json = await appel(`${API}?q=${q}`);
    const data = Array.isArray(json.data) ? json.data : [];
    if (!Array.isArray(json.data)) {
      console.warn('Réponse API inattendue (pas de tableau "data") :', json);
    }
    produits = data.map((p) => ({
      ...p,
      unites_par_lot: Number(p.unites_par_lot) || 1,
      quantite_entree: Number(p.quantite_entree),
      quantite_sortie: Number(p.quantite_sortie),
      reste: Number(p.reste),
      prix_achat: Number(p.prix_achat),
      prix_unitaire: Number(p.prix_unitaire),
    }));
    afficher();
  } catch (e) {
    $('resume').textContent = e.message;
    console.error('Erreur chargement :', e);
  }
}

function afficher() {
  corps.innerHTML = produits.map((p) => {
    const b = beneficePotentiel(p);
    return `
    <tr>
      <td>${echapper(p.produit)}</td>
      <td class="num">${nombre(lot(p))}</td>
      <td class="num">${nombre(p.quantite_entree)}</td>
      <td class="num">${nombre(p.quantite_sortie)}</td>
      <td class="num ${p.reste <= SEUIL_ALERTE ? 'reste-faible' : ''}">${nombre(p.reste)}</td>
      <td class="num">${nombre(p.prix_achat)} ${DEVISE}</td>
      <td class="num">${nombre(p.prix_unitaire)} ${DEVISE}</td>
      <td class="num ${classeBenefice(b)}">${nombre(b)} ${DEVISE}</td>
      <td class="col-actions" data-no-pdf>
        <button class="btn btn-small" data-action="modifier" data-id="${p.id}">Modifier</button>
        <button class="btn btn-small btn-danger" data-action="supprimer" data-id="${p.id}">Supprimer</button>
      </td>
    </tr>`;
  }).join('');
  vide.hidden = produits.length > 0;

  $('resume').textContent =
    `${produits.length} produit(s) · valeur du stock : ${nombre(somme(valeurStock))} ${DEVISE}` +
    ` · bénéfice potentiel : ${nombre(somme(beneficePotentiel))} ${DEVISE}` +
    ` · bénéfice réalisé : ${nombre(somme(beneficeRealise))} ${DEVISE}`;
}

/* ---------- Formulaire (ajout / modification) ---------- */
function majApercu() {
  const l = Math.max(1, parseInt($('f-lot').value, 10) || 1);
  const achat = +$('f-achat').value || 0;
  const unit = +$('f-unitaire').value || 0;
  const cout = arrondi(achat / l);
  const benef = arrondi(unit - cout);
  $('f-reste').textContent = nombre((+$('f-entree').value || 0) - (+$('f-sortie').value || 0));
  $('f-cout').textContent = `${nombre(cout)} ${DEVISE}`;
  $('f-benef').textContent = `${nombre(benef)} ${DEVISE}`;
  $('f-benef').className = classeBenefice(benef);
}

function ouvrirFormulaire(p = null) {
  form.reset();
  $('f-erreur').hidden = true;
  $('modal-titre').textContent = p ? 'Modifier le produit' : 'Ajouter un produit';
  $('f-id').value = p ? p.id : '';
  $('f-produit').value = p ? p.produit : '';
  $('f-lot').value = p ? lot(p) : 1;
  $('f-entree').value = p ? p.quantite_entree : 0;
  $('f-sortie').value = p ? p.quantite_sortie : 0;
  $('f-achat').value = p ? p.prix_achat : 0;
  $('f-unitaire').value = p ? p.prix_unitaire : 0;
  majApercu();
  modal.showModal();
  $('f-produit').focus();
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = $('f-id').value;
  const data = {
    id: id ? +id : undefined,
    produit: $('f-produit').value.trim(),
    unites_par_lot: $('f-lot').value,
    quantite_entree: $('f-entree').value,
    quantite_sortie: $('f-sortie').value,
    prix_achat: $('f-achat').value,
    prix_unitaire: $('f-unitaire').value,
  };
  try {
    await appel(API, { method: id ? 'PUT' : 'POST', body: JSON.stringify(data) });
    modal.close();
    toast(id ? 'Produit modifié' : 'Produit ajouté');
    charger();
  } catch (err) {
    $('f-erreur').textContent = err.message;
    $('f-erreur').hidden = false;
  }
});

['f-lot', 'f-entree', 'f-sortie', 'f-achat', 'f-unitaire'].forEach((id) => $(id).addEventListener('input', majApercu));
$('btn-ajouter').addEventListener('click', () => ouvrirFormulaire());
$('btn-annuler').addEventListener('click', () => modal.close());

/* ---------- Modifier / Supprimer ---------- */
corps.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const p = produits.find((x) => x.id == btn.dataset.id);
  if (btn.dataset.action === 'modifier') return ouvrirFormulaire(p);

  if (confirm(`Supprimer « ${p.produit} » ? Cette action est définitive.`)) {
    try {
      await appel(`${API}?id=${p.id}`, { method: 'DELETE' });
      toast('Produit supprimé');
      charger();
    } catch (err) { toast(err.message); }
  }
});

/* ---------- Recherche (avec léger délai) ---------- */
let minuteur;
$('recherche').addEventListener('input', () => { clearTimeout(minuteur); minuteur = setTimeout(charger, 250); });

/* ---------- Export PDF ---------- */
$('btn-pdf').addEventListener('click', () => {
  if (!produits.length) return toast('Aucune donnée à exporter');
  if (!window.jspdf || !window.jspdf.jsPDF) return toast('Bibliothèque PDF introuvable (CDN)');
  try { exporterPdf(); } catch (err) { console.error(err); toast('Erreur PDF : ' + err.message); }
});

function exporterPdf() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const largeur = doc.internal.pageSize.getWidth();
  const date = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

  // En-tête
  doc.setFillColor(23, 35, 59);
  doc.rect(0, 0, largeur, 26, 'F');
  doc.setTextColor(255);
  doc.setFont('helvetica', 'bold').setFontSize(18).text('État du stock', 14, 16);
  doc.setFont('helvetica', 'normal').setFontSize(10).text(`Édité le ${date}`, largeur - 14, 16, { align: 'right' });

  const totEntree = produits.reduce((s, p) => s + p.quantite_entree, 0);
  const totSortie = produits.reduce((s, p) => s + p.quantite_sortie, 0);
  const totReste  = produits.reduce((s, p) => s + p.reste, 0);

  const autoTable = typeof doc.autoTable === 'function' ? (o) => doc.autoTable(o) : (o) => window.jspdf.autoTable(doc, o);
  autoTable({
    startY: 34,
    head: [['Produit', 'Unités / lot', 'Qté entrée', 'Qté sortie', 'Reste', `Prix d\'achat (${DEVISE})`, `Prix unitaire (${DEVISE})`, `Bénéfice potentiel (${DEVISE})`]],
    body: produits.map((p) => [
      p.produit,
      nombrePdf(lot(p)),
      nombrePdf(p.quantite_entree), nombrePdf(p.quantite_sortie), nombrePdf(p.reste),
      nombrePdf(p.prix_achat), nombrePdf(p.prix_unitaire),
      nombrePdf(beneficePotentiel(p)),
    ]),
    foot: [['Total', '', nombrePdf(totEntree), nombrePdf(totSortie), nombrePdf(totReste), '', '', nombrePdf(somme(beneficePotentiel))]],
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 10, cellPadding: 3, lineColor: [215, 222, 232], lineWidth: 0.2, textColor: [31, 41, 55] },
    headStyles: { fillColor: [15, 118, 110], textColor: 255, fontStyle: 'bold' },
    footStyles: { fillColor: [23, 35, 59], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [238, 242, 247] },   // zèbre
    columnStyles: {
      0: { cellWidth: 'auto' },
      4: { fontStyle: 'bold' },
      7: { fontStyle: 'bold' },
    },
    didParseCell: (d) => {
      if (d.column.index > 0) d.cell.styles.halign = 'right';   // colonnes numériques à droite
      if (d.section === 'body' && d.column.index === 7 && beneficePotentiel(produits[d.row.index]) < 0) {
        d.cell.styles.textColor = [180, 35, 24];                // perte en rouge
      }
    },
    didDrawPage: () => {   // pied de page avec pagination
      const h = doc.internal.pageSize.getHeight();
      doc.setFontSize(9).setTextColor(100, 116, 139);
      doc.text(`Page ${doc.internal.getCurrentPageInfo().pageNumber}`, largeur - 14, h - 8, { align: 'right' });
    },
  });

  // Synthèse sous le tableau
  let y = (doc.lastAutoTable ? doc.lastAutoTable.finalY : 60) + 10;
  if (y > doc.internal.pageSize.getHeight() - 30) { doc.addPage(); y = 20; }
  doc.setTextColor(23, 35, 59).setFont('helvetica', 'bold').setFontSize(11).text('Synthèse', 14, y);
  doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(31, 41, 55);
  doc.text([
    `Valeur du stock (reste x prix unitaire) : ${nombrePdf(somme(valeurStock))} ${DEVISE}`,
    `Bénéfice potentiel sur le stock restant : ${nombrePdf(somme(beneficePotentiel))} ${DEVISE}`,
    `Bénéfice déjà réalisé sur les sorties : ${nombrePdf(somme(beneficeRealise))} ${DEVISE}`,
  ], 14, y + 7, { lineHeightFactor: 1.6 });

  doc.save(`stock-${new Date().toISOString().slice(0, 10)}.pdf`);
  toast('PDF téléchargé');
}

charger();
