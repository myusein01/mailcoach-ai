// app/page.tsx
import EmailForm from "@/components/EmailForm";

export default function Home() {
  return (
    <main className="w-full max-w-3xl">
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl shadow-xl px-6 py-7 md:px-8 md:py-9">
        <h1 className="text-3xl md:text-4xl font-semibold mb-2">
          MailCoach <span className="text-blue-400">AI</span>
        </h1>
        <p className="mb-6 text-slate-300">
          Décris ce que tu veux dire, je rédige un e-mail professionnel prêt à
          envoyer à ta place.
        </p>

        <EmailForm />
      </div>
      <p className="mt-4 text-center text-xs text-slate-500">
        ✉️ Conçu pour freelances, agences et petites entreprises.
      </p>
    </main>
  );
}
