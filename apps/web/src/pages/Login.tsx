import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRequestOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setFeedback(null);
    setIsLoading(true);

    try {
      await authApi.requestOtp(email);
      setStep("code");
      setFeedback("Código enviado. Confira seu e-mail e informe o OTP.");
    } catch (requestError) {
      if (requestError instanceof ApiError) {
        setError(requestError.message);
      } else {
        setError("Não foi possível solicitar OTP.");
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
    } catch (verifyError) {
      if (verifyError instanceof ApiError) {
        setError(verifyError.message);
      } else {
        setError("Código inválido ou expirado.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
        <div>
          <h1 className="text-2xl font-bold">Entrar no CrmPexe</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Faça login com OTP para acessar dashboard e dados.
          </p>
        </div>

        {step === "email" ? (
          <form onSubmit={handleRequestOtp} className="space-y-3">
            <label className="text-sm font-medium" htmlFor="email">E-mail</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="voce@empresa.com"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-md bg-primary text-primary-foreground py-2 text-sm font-medium disabled:opacity-60"
            >
              {isLoading ? "Enviando..." : "Receber código OTP"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Enviamos um código para <strong>{email}</strong>.
            </p>
            <label className="text-sm font-medium" htmlFor="code">Código OTP</label>
            <input
              id="code"
              type="text"
              required
              value={code}
              onChange={(event) => setCode(event.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="000000"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-md bg-primary text-primary-foreground py-2 text-sm font-medium disabled:opacity-60"
            >
              {isLoading ? "Validando..." : "Entrar"}
            </button>
            <button
              type="button"
              onClick={() => setStep("email")}
              className="w-full rounded-md border border-border py-2 text-sm"
            >
              Alterar e-mail
            </button>
          </form>
        )}

        {feedback ? <p className="text-sm text-emerald-500">{feedback}</p> : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <p className="text-xs text-muted-foreground">
          Se você já está autenticado, volte para o <Link to="/" className="underline">dashboard</Link>.
        </p>
      </div>
    </main>
  );
};

export default Login;
