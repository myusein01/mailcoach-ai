console.log("MailCoach AI content script loaded");

// Zone de texte principale (corps du mail)
function findComposeBox() {
  return document.querySelector(
    'div[role="textbox"][aria-label="Corps du message"], div[role="textbox"][g_editable="true"]'
  );
}

// Champ objet Gmail
function findSubjectInput() {
  return document.querySelector('input[name="subjectbox"]');
}

// === CONFIG API ===

// 🔹 En DEV local :
const API_ENDPOINT = "http://localhost:3000/api/improve-email";

// 🔹 En PROD, quand tu seras prêt :
// const API_ENDPOINT = "https://www.mailcoach-ai.com/api/improve-email";

// ===================

// Bouton flottant
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
  const subjectInput = findSubjectInput();

  if (!box) {
    alert("Impossible de trouver le contenu du mail 😅");
    return;
  }

  const originalBody = box.innerText.trim();
  const originalSubject = subjectInput ? subjectInput.value.trim() : "";

  if (!originalBody) {
    alert("Écris d'abord un email avant de l'améliorer 😉");
    return;
  }

  try {
    const res = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: originalBody,
        subject: originalSubject,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Erreur API:", data);
      alert("Erreur lors de l'appel à MailCoach AI.");
      return;
    }

    const improvedSubject = data.subject || originalSubject;
    const improvedBody = data.body || originalBody;

    const ok = confirm(
      "Remplacer l'objet et le corps par la version améliorée ?"
    );
    if (ok) {
      if (subjectInput && improvedSubject) {
        subjectInput.value = improvedSubject;
      }

      // On remplace le contenu en gardant les sauts de ligne
      const html = improvedBody
        .split("\n")
        .map((line) => line.trim())
        .join("<br>");
      box.innerHTML = html;
    }
  } catch (err) {
    console.error(err);
    alert("Erreur lors de l'appel à MailCoach AI.");
  }
}

function init() {
  const widget = createWidget();
  widget.addEventListener("click", improveEmail);
}

window.addEventListener("load", () => {
  setTimeout(init, 4000);
});
