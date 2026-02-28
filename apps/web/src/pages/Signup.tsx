import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";

export default function Signup() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [email, setEmail] = useState("");
  const [emailConfirmation, setEmailConfirmation] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"form" | "code">("form");
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRequestOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setFeedback(null);

    if (email !== emailConfirmation) {
      setError("Os e-mails nao conferem.");
      return;
    }

    setIsLoading(true);

    try {
      await authApi.requestSignupOtp({
        email,
        name,
        contact,
        emailConfirmation
      });
      setStep("code");
      setFeedback("Codigo enviado para seu e-mail. Informe abaixo.");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Nao foi possivel criar a conta.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setFeedback(null);
    setIsLoading(true);

    try {
      await authApi.verifyOtp(email, code);
      navigate("/", { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Codigo invalido ou expirado.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
        <div>
          <h1 className="text-2xl font-bold">Criar conta no AtendeAi</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Preencha seus dados para se cadastrar.
          </p>
        </div>

        {step === "form" ? (
          <form onSubmit={handleRequestOtp} className="space-y-3">
            <div>
              <label className="text-sm font-medium" htmlFor="name">Nome completo</label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
                placeholder="Seu nome"
              />
            </div>

            <div>
              <label className="text-sm font-medium" htmlFor="contact">Telefone / Contato</label>
              <input
                id="contact"
                type="text"
                required
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
                placeholder="(11) 99999-9999"
              />
            </div>

            <div>
              <label className="text-sm font-medium" htmlFor="signup-email">E-mail</label>
              <input
                id="signup-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
                placeholder="voce@empresa.com"
              />
            </div>

            <div>
              <label className="text-sm font-medium" htmlFor="email-confirm">Confirme o e-mail</label>
              <input
                id="email-confirm"
                type="email"
                required
                value={emailConfirmation}
                onChange={(e) => setEmailConfirmation(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
                placeholder="voce@empresa.com"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-md bg-primary text-primary-foreground py-2.5 text-sm font-medium disabled:opacity-60"
            >
              {isLoading ? "Enviando..." : "Criar conta"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Enviamos um codigo para <strong>{email}</strong>.
            </p>
            <div>
              <label className="text-sm font-medium" htmlFor="otp-code">Codigo OTP</label>
              <input
                id="otp-code"
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
                placeholder="000000"
                maxLength={6}
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-md bg-primary text-primary-foreground py-2.5 text-sm font-medium disabled:opacity-60"
            >
              {isLoading ? "Validando..." : "Confirmar e entrar"}
            </button>
            <button
              type="button"
              onClick={() => setStep("form")}
              className="w-full rounded-md border border-border py-2 text-sm"
            >
              Voltar
            </button>
          </form>
        )}

        {feedback && <p className="text-sm text-emerald-500">{feedback}</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}

        <p className="text-sm text-muted-foreground">
          Ja tem conta?{" "}
          <Link to="/login" className="text-primary underline">
            Fazer login
          </Link>
        </p>
      </div>
    </main>
  );
}
