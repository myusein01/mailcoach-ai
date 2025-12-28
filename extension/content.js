console.log("MailCoach AI content script loaded");

// ================= CONFIG =================

// PROD par défaut
let API_ENDPOINT = "https://www.mailcoach-ai.com/api/improve-email";
const PRICING_URL = "https://www.mailcoach-ai.com/pricing";

// DEV auto si forçage ?mailcoach_dev=1
try {
  const url = new URL(window.location.href);
  if (url.searchParams.get("mailcoach_dev") === "1") {
    API_ENDPOINT = "http://localhost:3000/api/improve-email";
  }
} catch {}

// ================= UTILS =================

function findComposeBox() {
  return document.querySelector(
    'div[role="textbox"][aria-label="Corps du message"], div[role="textbox"][g_editable="true"]'
  );
}

function findSubjectInput() {
  return document.querySelector('input[name="subjectbox"]');
}

// ================= LANGUES =================

const LANGS = [
  { code: "fr", label: "Français" },
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "de", label: "Deutsch" },
  { code: "it", label: "Italiano" },
  { code: "pt", label: "Português" }
];

function langLabel(code) {
  return LANGS.find((l) => l.code === code)?.label || code;
}

function langChipText(code) {
  return (code || "fr").toUpperCase();
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

// ================= IDENTITÉ =================

function getActiveGmailEmail() {
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

      resolve({ userEmail: email.toLowerCase() });
    });
  });
}

// ================= UI =================

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
    boxShadow: "0 10px 30px rgba(15,23,42,0.5)"
  });

  document.body.appendChild(btn);
  return btn;
}

function setMainButtonLoading(btn, isLoading) {
  if (!btn) return;

  if (isLoading) {
    btn.dataset.prev = btn.innerText;
    btn.innerText = "⏳ Amélioration…";
    btn.disabled = true;
    btn.style.opacity = "0.8";
  } else {
    btn.innerText = btn.dataset.prev || "✨ Améliorer avec MailCoach";
    btn.disabled = false;
    btn.style.opacity = "1";
  }
}

function createLanguageChip(lang) {
  const chip = document.createElement("button");
  chip.id = "mailcoach-lang-btn";
  chip.innerText = `🌐 ${langChipText(lang)}`;

  Object.assign(chip.style, {
    position: "fixed",
    bottom: "66px",
    right: "20px",
    zIndex: "9999",
    padding: "8px 14px",
    borderRadius: "999px",
    border: "1px solid #334155",
    background: "#020617",
    color: "#e5e7eb",
    fontSize: "12px",
    cursor: "pointer"
  });

  document.body.appendChild(chip);
  return chip;
}

// ================= ACTION =================

async function improveEmail(btn) {
  const box = findComposeBox();
  if (!box) return alert("Email introuvable.");

  const body = box.innerText.trim();
  if (!body) return alert("Écris un email avant.");

  const subjectInput = findSubjectInput();
  const subject = subjectInput?.value.trim() || "";

  const { userEmail } = await getUserIdentity();
  if (!userEmail) return;

  const language = await getStoredLanguage();
  setMainButtonLoading(btn, true);

  try {
    const res = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: body, subject, userEmail, language })
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (data?.errorCode === "LIMIT_REACHED") {
        if (confirm("Limite atteinte. Passer Pro ?")) {
          window.open(PRICING_URL, "_blank");
        }
      } else {
        alert(data?.error || "Erreur MailCoach.");
      }
      return;
    }

    if (!confirm("Remplacer le mail par la version améliorée ?")) return;

    if (subjectInput && data.subject) {
      subjectInput.value = data.subject;
      subjectInput.dispatchEvent(new Event("input", { bubbles: true }));
    }

    box.innerHTML = data.body.split("\n").join("<br>");
    box.dispatchEvent(new Event("input", { bubbles: true }));
  } catch {
    alert("Erreur réseau.");
  } finally {
    setMainButtonLoading(btn, false);
  }
}

// ================= INIT =================

async function init() {
  if (document.getElementById("mailcoach-main-btn")) return;

  const lang = await getStoredLanguage();
  const btn = createMainButton();
  createLanguageChip(lang);

  btn.addEventListener("click", () => improveEmail(btn));
}

window.addEventListener("load", () => {
  setTimeout(init, 3000);
});
