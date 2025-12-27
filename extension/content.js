// content.js (VERSION COMPLÈTE – bouton flottant + langue actuelle au-dessus + loading sur le bouton)

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

// PROD par défaut
let API_ENDPOINT = "https://www.mailcoach-ai.com/api/improve-email";

// DEV auto si tu es en local (pratique quand tu codes)
try {
  // si tu veux forcer DEV, mets ?mailcoach_dev=1 dans l'URL Gmail
  const url = new URL(window.location.href);
  const forceDev = url.searchParams.get("mailcoach_dev") === "1";
  if (forceDev) API_ENDPOINT = "http://localhost:3000/api/improve-email";
} catch {}

const PRICING_URL = "https://www.mailcoach-ai.com/pricing";

// ===================

// ---------- LANGUES ----------
const LANGS = [
  { code: "fr", label: "Français" },
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "de", label: "Deutsch" },
  { code: "it", label: "Italiano" },
  { code: "pt", label: "Português" },
];

function langLabel(code) {
  const found = LANGS.find((l) => l.code === code);
  return found ? found.label : code;
}

function langChipText(code) {
  return (code || "fr").toUpperCase(); // ex: FR / EN / ES
}

function getStoredLanguage() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(["mailcoach_language"], (res) => {
      resolve(res.mailcoach_language || "fr");
    });
  });
}

function setStoredLanguage(lang) {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ mailcoach_language: lang }, resolve);
  });
}

// ---------- IDENTITÉ GMAIL ----------
function getActiveGmailEmail() {
  // méthode simple (suffit souvent)
  const text = document.body?.innerText || "";
  const match = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return match ? match[0].toLowerCase() : null;
}

function getUserIdentity() {
  return new Promise((resolve) => {
    const gmail = getActiveGmailEmail();

    chrome.storage.sync.get(["mailcoach_userEmail"], (res) => {
      let email = gmail || res.mailcoach_userEmail;

      if (!email) {
        email = prompt("Entre ton email MailCoach AI :");
        if (!email) return resolve({ userEmail: null });
        chrome.storage.sync.set({ mailcoach_userEmail: email });
      }

      resolve({ userEmail: String(email).toLowerCase() });
    });
  });
}

// ---------- UI : Bouton principal ----------
function createMainButton() {
  const btn = document.createElement("button");
  btn.id = "mailcoach-main-btn";
  btn.innerText = "✨ Améliorer avec MailCoach";

  Object.assign(btn.style, {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    zIndex: "9999",
    padding: "10px 16px",
    borderRadius: "999px",
    border: "none",
    background: "#3b82f6",
    color: "white",
    fontSize: "13px",
    cursor: "pointer",
    boxShadow: "0 10px 30px rgba(15,23,42,0.5)",
    transition: "transform 120ms ease, opacity 120ms ease, background 120ms ease",
  });

  btn.onmouseenter = () => (btn.style.transform = "translateY(-1px)");
  btn.onmouseleave = () => (btn.style.transform = "translateY(0px)");

  document.body.appendChild(btn);
  return btn;
}

function setMainButtonLoading(btn, isLoading) {
  if (!btn) return;

  if (isLoading) {
    btn.dataset.prevText = btn.innerText;
    btn.innerText = "⏳ Amélioration…";
    btn.disabled = true;
    btn.style.opacity = "0.85";
    btn.style.cursor = "not-allowed";
    btn.style.background = "#2563eb";
  } else {
    btn.innerText = btn.dataset.prevText || "✨ Améliorer avec MailCoach";
    btn.disabled = false;
    btn.style.opacity = "1";
    btn.style.cursor = "pointer";
    btn.style.background = "#3b82f6";
  }
}

// ---------- UI : Chip langue (au-dessus) ----------
function createLanguageChip(initialLangCode) {
  const chip = document.createElement("button");
  chip.id = "mailcoach-lang-btn";
  chip.innerText = `🌐 ${langChipText(initialLangCode)}`;

  Object.assign(chip.style, {
    position: "fixed",
    bottom: "66px", // ✅ au-dessus du bouton principal
    right: "20px",
    zIndex: "9999",
    padding: "8px 14px",
    borderRadius: "999px",
    border: "1px solid #334155",
    background: "#020617",
    color: "#e5e7eb",
    fontSize: "12px",
    cursor: "pointer",
    boxShadow: "0 6px 20px rgba(15,23,42,0.45)",
  });

  document.body.appendChild(chip);
  return chip;
}

function updateLanguageChip(chip, langCode) {
  if (!chip) return;
  chip.innerText = `🌐 ${langChipText(langCode)}`;
  chip.title = `Langue actuelle : ${langLabel(langCode)} (${langChipText(langCode)})`;
}

// ---------- UI : Modal langue ----------
function createLanguageModal(onPick) {
  const backdrop = document.createElement("div");
  backdrop.style.position = "fixed";
  backdrop.style.inset = "0";
  backdrop.style.zIndex = "10000";
  backdrop.style.background = "rgba(0,0,0,0.55)";
  backdrop.style.display = "none";
  backdrop.style.alignItems = "center";
  backdrop.style.justifyContent = "center";

  const modal = document.createElement("div");
  Object.assign(modal.style, {
    background: "#020617",
    borderRadius: "14px",
    padding: "16px",
    width: "320px",
    border: "1px solid #334155",
    color: "#e5e7eb",
  });

  const title = document.createElement("div");
  title.innerText = "Choisir la langue";
  title.style.fontWeight = "700";
  title.style.marginBottom = "10px";

  const hint = document.createElement("div");
  hint.innerText = "La langue choisie sera utilisée pour la prochaine amélioration.";
  hint.style.fontSize = "12px";
  hint.style.color = "#94a3b8";
  hint.style.marginBottom = "12px";

  modal.appendChild(title);
  modal.appendChild(hint);

  LANGS.forEach((l) => {
    const btn = document.createElement("button");
    btn.innerText = `${l.label} (${l.code.toUpperCase()})`;

    Object.assign(btn.style, {
      width: "100%",
      marginBottom: "8px",
      padding: "10px",
      borderRadius: "12px",
      border: "1px solid #334155",
      background: "#0f172a",
      color: "white",
      cursor: "pointer",
      textAlign: "left",
    });

    btn.onmouseenter = () => (btn.style.background = "#111c33");
    btn.onmouseleave = () => (btn.style.background = "#0f172a");

    btn.onclick = async () => {
      await setStoredLanguage(l.code);
      backdrop.style.display = "none";
      onPick(l.code);
    };

    modal.appendChild(btn);
  });

  backdrop.appendChild(modal);

  backdrop.onclick = (e) => {
    if (e.target === backdrop) backdrop.style.display = "none";
  };

  document.body.appendChild(backdrop);
  return backdrop;
}

// ---------- ACTION PRINCIPALE ----------
async function improveEmail(mainBtn) {
  const box = findComposeBox();
  if (!box) {
    alert("Contenu du mail introuvable. Veuillez réessayer.");
    return;
  }

  const originalBody = box.innerText.trim();
  const subjectInput = findSubjectInput();
  const originalSubject = subjectInput ? subjectInput.value.trim() : "";

  if (!originalBody) {
    alert("Veuillez d'abord écrire un email avant de l'améliorer.");
    return;
  }

  const { userEmail } = await getUserIdentity();
  if (!userEmail) {
    alert("Email manquant. Impossible d'utiliser l’extension.");
    return;
  }

  const language = await getStoredLanguage();

  setMainButtonLoading(mainBtn, true);

  try {
    const res = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: originalBody,
        subject: originalSubject,
        userEmail,
        language, // ✅ langue choisie
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error("Erreur API:", data);

      if (data && data.errorCode === "LIMIT_REACHED") {
        const goPro = confirm(
          "Tu as atteint ta limite gratuite sur MailCoach AI.\n\n" +
            "Clique OK pour passer en Pro et débloquer les améliorations illimitées."
        );
        if (goPro) window.open(PRICING_URL, "_blank");
      } else {
        alert(data?.error || "Erreur lors de l'appel à MailCoach AI.");
      }
      return;
    }

    const improvedSubject = data.subject || originalSubject;
    const improvedBody = data.body || originalBody;

    const ok = confirm(
      `Remplacer l'objet et le corps par la version améliorée ?\n\n` +
        `Langue: ${langLabel(language)} (${language.toUpperCase()})`
    );

    if (!ok) return;

    // objet
    if (subjectInput && improvedSubject) {
      subjectInput.value = improvedSubject;
      subjectInput.dispatchEvent(new Event("input", { bubbles: true }));
      subjectInput.dispatchEvent(new Event("change", { bubbles: true }));
    }

    // corps (HTML avec <br>)
    const html = improvedBody
      .split("\n")
      .map((line) => line.trim())
      .join("<br>");

    box.innerHTML = html;

    box.dispatchEvent(new Event("input", { bubbles: true }));
    box.dispatchEvent(new Event("change", { bubbles: true }));
  } catch (err) {
    console.error(err);
    alert("Erreur lors de l'appel à MailCoach AI.");
  } finally {
    setMainButtonLoading(mainBtn, false);
  }
}

// ---------- INIT ----------
async function init() {
  const initialLang = await getStoredLanguage();

  const mainBtn = createMainButton();
  const langChip = createLanguageChip(initialLang);
  updateLanguageChip(langChip, initialLang);

  const modal = createLanguageModal((newLang) => {
    updateLanguageChip(langChip, newLang);
  });

  mainBtn.addEventListener("click", () => improveEmail(mainBtn));
  langChip.addEventListener("click", () => {
    modal.style.display = "flex";
  });
}

window.addEventListener("load", () => {
  setTimeout(init, 4000);
});
