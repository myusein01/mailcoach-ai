console.log("MailCoach AI content script loaded");

// Fonction utilitaire pour trouver la zone de texte principale de Gmail
function findComposeBox() {
  // Gmail utilise un div[role="textbox"] pour le contenu
  return document.querySelector('div[role="textbox"][aria-label="Corps du message"], div[role="textbox"][g_editable="true"]');
}

// Crée un petit bouton flottant
function createWidget() {
  const widget = document.createElement("button");
  widget.innerText = "✨ Améliorer avec MailCoach";
  widget.style.position = "fixed";
  widget.style.bottom = "20px";
  widget.style.right = "20px";
  widget.style.zIndex = "9999";
  widget.style.padding = "10px 14px";
  widget.style.borderRadius = "999px";
  widget.style.border = "none";
  widget.style.background = "#3b82f6";
  widget.style.color = "white";
  widget.style.fontSize = "13px";
  widget.style.cursor = "pointer";
  widget.style.boxShadow = "0 10px 30px rgba(15,23,42,0.5)";

  document.body.appendChild(widget);
  return widget;
}

async function improveEmail() {
  const box = findComposeBox();
  if (!box) {
    alert("Impossible de trouver le contenu du mail 😅");
    return;
  }

  const original = box.innerText.trim();
  if (!original) {
    alert("Écris d'abord un email avant de l'améliorer 😉");
    return;
  }

  // Appel à ton backend MailCoach
  try {
    const res = await fetch("https://www.mailcoach-ai.com/api/improve-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: original }),
    });

    const data = await res.json();
    const improved = data.improved || "";

    if (!improved) {
      alert("Pas de réponse de MailCoach AI.");
      return;
    }

    // Confirmation avant de remplacer
    const ok = confirm("Remplacer ton email par la version améliorée ?");
    if (ok) {
      box.innerText = improved;
    } else {
      // Option : copier dans le presse-papier
      await navigator.clipboard.writeText(improved);
      alert("Version améliorée copiée dans le presse-papier ✅");
    }
  } catch (err) {
    console.error(err);
    alert("Erreur lors de l'appel à MailCoach AI.");
  }
}

// Initialisation
function init() {
  const widget = createWidget();
  widget.addEventListener("click", improveEmail);
}

window.addEventListener("load", () => {
  setTimeout(init, 4000); // on laisse Gmail se charger un peu
});
