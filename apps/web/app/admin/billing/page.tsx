"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent
} from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  fetchWorkspaceBillingSummary,
  type BillingSummary
} from "@/lib/billing";

const planDetails = {
  name: "Plano Profissional",
  price: "R$ 299/mês",
  description:
    "Atende times em crescimento com automações liberadas e suporte prioritário.",
  features: [
    "Conversas e contatos ilimitados",
    "Automações inteligentes",
    "Relatórios e KPIs do workspace",
    "Suporte prioritário via e-mail"
  ]
};

const statusLabels: Record<string, string> = {
  ACTIVE: "Ativo",
  PENDING: "Pagamento pendente",
  IN_PROCESS: "Pagamento em análise",
  REJECTED: "Inadimplente",
  CANCELED: "Cancelado",
  NO_SUBSCRIPTION: "Sem assinatura",
  NO_WORKSPACE: "Workspace não selecionado"
};

const statusStyles: Record<string, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-100",
  PENDING: "bg-amber-50 text-amber-700 border-amber-100",
  IN_PROCESS: "bg-amber-50 text-amber-700 border-amber-100",
  REJECTED: "bg-red-50 text-red-700 border-red-100",
  CANCELED: "bg-gray-100 text-gray-600 border-gray-200",
  NO_SUBSCRIPTION: "bg-gray-100 text-gray-600 border-gray-200",
  NO_WORKSPACE: "bg-gray-100 text-gray-600 border-gray-200"
};

type PaymentFormState = {
  holder: string;
  number: string;
  expiresAt: string;
  cvc: string;
};

const emptyPaymentForm: PaymentFormState = {
  holder: "",
  number: "",
  expiresAt: "",
  cvc: ""
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value);

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });

export default function BillingAdminPage() {
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentForm, setPaymentForm] =
    useState<PaymentFormState>(emptyPaymentForm);
  const [paymentFeedback, setPaymentFeedback] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const loadSummary = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await fetchWorkspaceBillingSummary(controller.signal);
        setSummary(data);
      } catch (fetchError) {
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Erro inesperado ao carregar cobrança."
        );
      } finally {
        setLoading(false);
      }
    };

    void loadSummary();

    return () => controller.abort();
  }, []);

  const isDelinquent = summary?.isDelinquent ?? false;
  const statusLabel = summary
    ? (statusLabels[summary.status] ?? summary.status)
    : "Carregando...";
  const statusClass = summary
    ? (statusStyles[summary.status] ?? statusStyles.NO_SUBSCRIPTION)
    : statusStyles.NO_SUBSCRIPTION;

  const invoices = useMemo(() => summary?.invoices ?? [], [summary]);

  const handlePaymentChange =
    (field: keyof PaymentFormState) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setPaymentForm((prev) => ({
        ...prev,
        [field]: event.target.value
      }));
    };

  const handlePaymentSubmit = (event: FormEvent) => {
    event.preventDefault();
    setPaymentFeedback("Método de pagamento atualizado com sucesso.");
    setShowPaymentForm(false);
    setPaymentForm(emptyPaymentForm);
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      <header className="border-b bg-white px-6 py-6 shadow-sm">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2">
          <p className="text-sm font-medium text-blue-600">Admin</p>
          <h1 className="text-2xl font-semibold text-gray-900">
            Cobrança do workspace
          </h1>
          <p className="text-sm text-gray-500">
            Acompanhe o plano, o status da assinatura e os pagamentos do
            workspace atual.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link href="/dashboard">
              <Button variant="outline">Voltar ao dashboard</Button>
            </Link>
            <Link href="/admin/automations">
              <Button variant="outline">Gerenciar automações</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10">
        {isDelinquent ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Workspace inadimplente. O envio de mensagens e automações está
            bloqueado até a regularização do pagamento.
          </div>
        ) : null}

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <div className="space-y-6">
            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Plano atual
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-gray-900">
                    {planDetails.name}
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    {planDetails.description}
                  </p>
                </div>
                <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-center text-sm font-semibold text-blue-700">
                  {planDetails.price}
                </div>
              </div>
              <ul className="mt-6 grid gap-3 text-sm text-gray-600 sm:grid-cols-2">
                {planDetails.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Status da assinatura
                  </p>
                  <div className="mt-2 flex items-center gap-3">
                    <span
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${statusClass}`}
                    >
                      {loading ? "Carregando..." : statusLabel}
                    </span>
                    {summary?.lastUpdatedAt ? (
                      <span className="text-xs text-gray-500">
                        Atualizado em {formatDate(summary.lastUpdatedAt)}
                      </span>
                    ) : null}
                  </div>
                </div>
                <Button variant="outline">Solicitar revisão</Button>
              </div>
              <p className="mt-4 text-sm text-gray-500">
                Caso identifique cobranças divergentes, abra um chamado com o
                time financeiro.
              </p>
            </div>

            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Faturas</h3>
                <Button variant="outline">Baixar comprovantes</Button>
              </div>
              {loading ? (
                <div className="mt-4 text-sm text-gray-500">
                  Carregando faturas...
                </div>
              ) : invoices.length === 0 ? (
                <div className="mt-4 rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-500">
                  Nenhuma fatura disponível para este workspace.
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {invoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="flex flex-col gap-2 rounded-xl border bg-gray-50 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-medium text-gray-800">
                          Fatura #{invoice.id}
                        </p>
                        <p className="text-xs text-gray-500">
                          Vencimento em {formatDate(invoice.dueDate)}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-semibold text-gray-800">
                          {formatCurrency(invoice.amount)}
                        </span>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-600">
                          {invoice.status === "PAID"
                            ? "Pago"
                            : invoice.status === "OVERDUE"
                              ? "Em atraso"
                              : "Pendente"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900">
                Método de pagamento
              </h3>
              {summary?.paymentMethod ? (
                <div className="mt-4 space-y-2 text-sm text-gray-600">
                  <p>
                    {summary.paymentMethod.brand} ••••{" "}
                    {summary.paymentMethod.last4}
                  </p>
                  <p>Titular: {summary.paymentMethod.holder}</p>
                  <p>Validade: {summary.paymentMethod.expiresAt}</p>
                </div>
              ) : (
                <p className="mt-3 text-sm text-gray-500">
                  Nenhum método cadastrado. Atualize para regularizar cobranças
                  futuras.
                </p>
              )}
              <Button
                className="mt-4 w-full"
                onClick={() => {
                  setShowPaymentForm((prev) => !prev);
                  setPaymentFeedback(null);
                }}
              >
                {showPaymentForm ? "Cancelar atualização" : "Atualizar método"}
              </Button>
              {paymentFeedback ? (
                <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                  {paymentFeedback}
                </div>
              ) : null}
            </div>

            {showPaymentForm ? (
              <form
                onSubmit={handlePaymentSubmit}
                className="rounded-2xl border bg-white p-6 shadow-sm"
              >
                <h4 className="text-base font-semibold text-gray-800">
                  Atualizar cartão
                </h4>
                <div className="mt-4 space-y-3 text-sm text-gray-600">
                  <label className="flex flex-col gap-2">
                    Titular
                    <input
                      className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none"
                      value={paymentForm.holder}
                      onChange={handlePaymentChange("holder")}
                      placeholder="Nome impresso no cartão"
                      required
                    />
                  </label>
                  <label className="flex flex-col gap-2">
                    Número do cartão
                    <input
                      className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none"
                      value={paymentForm.number}
                      onChange={handlePaymentChange("number")}
                      placeholder="0000 0000 0000 0000"
                      required
                    />
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="flex flex-col gap-2">
                      Validade
                      <input
                        className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none"
                        value={paymentForm.expiresAt}
                        onChange={handlePaymentChange("expiresAt")}
                        placeholder="MM/AA"
                        required
                      />
                    </label>
                    <label className="flex flex-col gap-2">
                      CVV
                      <input
                        className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none"
                        value={paymentForm.cvc}
                        onChange={handlePaymentChange("cvc")}
                        placeholder="000"
                        required
                      />
                    </label>
                  </div>
                </div>
                <Button
                  type="submit"
                  className="mt-4 w-full bg-blue-600 hover:bg-blue-700"
                >
                  Salvar método
                </Button>
                <p className="mt-3 text-xs text-gray-500">
                  Atualização simulada para o ambiente atual. Integração real
                  será feita via provedor de cobrança.
                </p>
              </form>
            ) : null}
          </aside>
        </section>
      </main>
    </div>
  );
}
