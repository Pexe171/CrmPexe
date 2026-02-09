"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { SidebarNav } from "@/components/sidebar-nav";
import { Button } from "@/components/ui/button";

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type Company = {
  id: string;
  name: string;
  domain?: string | null;
  phone?: string | null;
  customFields?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

type CompanyFormState = {
  name: string;
  domain: string;
  phone: string;
  customFields: string;
};

const emptyForm: CompanyFormState = {
  name: "",
  domain: "",
  phone: "",
  customFields: ""
};

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formState, setFormState] = useState<CompanyFormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const totalCompanies = companies.length;
  const lastUpdatedCompany = companies
    .slice()
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${apiUrl}/api/companies`, {
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error("Não foi possível carregar as empresas.");
      }

      const data = (await response.json()) as Company[];
      setCompanies(data);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Erro inesperado ao carregar empresas.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchCompanies();
  }, [fetchCompanies]);

  const parsedCustomFields = useMemo(() => {
    if (!formState.customFields.trim()) {
      return null;
    }

    try {
      return JSON.parse(formState.customFields) as Record<string, unknown>;
    } catch {
      return null;
    }
  }, [formState.customFields]);

  const handleChange =
    (field: keyof CompanyFormState) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setFormState((prev) => ({
        ...prev,
        [field]: event.target.value
      }));
    };

  const resetForm = () => {
    setFormState(emptyForm);
    setEditingId(null);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload = {
      name: formState.name,
      domain: formState.domain || null,
      phone: formState.phone || null,
      customFields: parsedCustomFields
    };

    try {
      const response = await fetch(`${apiUrl}/api/companies${editingId ? `/${editingId}` : ""}`,
        {
          method: editingId ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "include",
          body: JSON.stringify(payload)
        }
      );

      if (!response.ok) {
        throw new Error("Não foi possível salvar a empresa.");
      }

      resetForm();
      await fetchCompanies();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Erro inesperado ao salvar empresa.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (company: Company) => {
    setEditingId(company.id);
    setFormState({
      name: company.name,
      domain: company.domain ?? "",
      phone: company.phone ?? "",
      customFields: company.customFields ? JSON.stringify(company.customFields, null, 2) : ""
    });
  };

  const handleDelete = async (companyId: string) => {
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`${apiUrl}/api/companies/${companyId}`, {
        method: "DELETE",
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error("Não foi possível remover a empresa.");
      }

      await fetchCompanies();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Erro inesperado ao remover empresa.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 md:pl-80">
      <header className="border-b bg-slate-900 px-6 py-6 shadow-sm">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2">
          <div className="flex items-center gap-3">
            <SidebarNav variant="client" />
            <p className="text-sm font-medium text-blue-600">Empresas</p>
          </div>
          <h1 className="text-2xl font-semibold text-slate-100">
            Cadastre e gerencie empresas do seu workspace
          </h1>
          <p className="text-sm text-slate-400">
            Mantenha o cadastro de contas atualizado para facilitar relacionamentos e automações.
          </p>
          <div className="mt-3 flex gap-3">
            <Link href="/dashboard">
              <Button variant="outline">Voltar ao dashboard</Button>
            </Link>
            <Link href="/workspaces">
              <Button variant="outline">Trocar workspace</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10 lg:flex-row">
        <section className="flex-1 space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border bg-slate-900 p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-400">Empresas cadastradas</p>
              <p className="mt-2 text-2xl font-semibold text-slate-100">
                {loading ? "-" : totalCompanies}
              </p>
            </div>
            <div className="rounded-xl border bg-slate-900 p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-400">Última atualização</p>
              <p className="mt-2 text-sm font-semibold text-slate-100">
                {loading
                  ? "-"
                  : lastUpdatedCompany?.updatedAt
                    ? new Date(lastUpdatedCompany.updatedAt).toLocaleDateString("pt-BR")
                    : "-"}
              </p>
            </div>
            <div className="rounded-xl border bg-slate-900 p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-400">Status do cadastro</p>
              <p className="mt-2 text-sm font-semibold text-slate-100">
                {loading ? "Carregando..." : "Base pronta para automações"}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-100">
              Empresas cadastradas
            </h2>
            <Button variant="outline" onClick={fetchCompanies} disabled={loading}>
              Atualizar lista
            </Button>
          </div>

          {loading ? (
            <div className="rounded-xl border bg-slate-900 p-6 text-sm text-slate-400 shadow-sm">
              Carregando empresas...
            </div>
          ) : companies.length === 0 ? (
            <div className="rounded-xl border bg-slate-900 p-6 text-sm text-slate-400 shadow-sm">
              Nenhuma empresa cadastrada ainda. Use o formulário ao lado para criar a primeira.
            </div>
          ) : (
            <div className="grid gap-4">
              {companies.map((company) => (
                <div key={company.id} className="rounded-xl border bg-slate-900 p-5 shadow-sm">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-100">{company.name}</h3>
                      <p className="text-sm text-slate-400">
                        {company.domain ? company.domain : "Domínio não informado"}
                      </p>
                      <p className="text-sm text-slate-400">
                        {company.phone ? company.phone : "Telefone não informado"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => handleEdit(company)}>
                        Editar
                      </Button>
                      <Button
                        className="bg-red-600 hover:bg-red-700"
                        onClick={() => handleDelete(company.id)}
                        disabled={submitting}
                      >
                        Remover
                      </Button>
                    </div>
                  </div>
                  <div className="mt-4 rounded-lg bg-slate-950 px-4 py-3 text-xs text-slate-300">
                    <p className="font-semibold text-slate-200">Custom fields</p>
                    <pre className="mt-2 whitespace-pre-wrap text-xs text-slate-300">
                      {company.customFields ? JSON.stringify(company.customFields, null, 2) : "Nenhum campo adicional."}
                    </pre>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <aside className="w-full max-w-md rounded-xl border bg-slate-900 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-100">
            {editingId ? "Editar empresa" : "Nova empresa"}
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Preencha os campos principais e defina custom fields em JSON.
          </p>
          <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200" htmlFor="company-name">
                Nome da empresa
              </label>
              <input
                id="company-name"
                type="text"
                value={formState.name}
                onChange={handleChange("name")}
                placeholder="Ex: Acme Tecnologia"
                className="w-full rounded-lg border border-slate-800 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200" htmlFor="company-domain">
                Domínio
              </label>
              <input
                id="company-domain"
                type="text"
                value={formState.domain}
                onChange={handleChange("domain")}
                placeholder="acme.com"
                className="w-full rounded-lg border border-slate-800 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200" htmlFor="company-phone">
                Telefone
              </label>
              <input
                id="company-phone"
                type="text"
                value={formState.phone}
                onChange={handleChange("phone")}
                placeholder="+55 11 9999-9999"
                className="w-full rounded-lg border border-slate-800 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200" htmlFor="company-custom-fields">
                Custom fields (JSON)
              </label>
              <textarea
                id="company-custom-fields"
                value={formState.customFields}
                onChange={handleChange("customFields")}
                placeholder='{"segmento": "SaaS", "tamanho": "50-100"}'
                rows={5}
                className="w-full rounded-lg border border-slate-800 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
              {formState.customFields.trim() && !parsedCustomFields && (
                <p className="text-xs text-red-500">JSON inválido. Corrija para salvar.</p>
              )}
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-2">
              <Button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                disabled={submitting || (formState.customFields.trim().length > 0 && !parsedCustomFields)}
              >
                {submitting ? "Salvando..." : editingId ? "Atualizar empresa" : "Criar empresa"}
              </Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
              )}
            </div>
          </form>
          <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-700">
            <p className="font-semibold">Boas práticas</p>
            <p className="mt-2">
              Cadastre domínio e telefone para enriquecer conversas, deals e relatórios. Os campos
              customizados ajudam a personalizar o CRM por segmento.
            </p>
          </div>
        </aside>
      </main>
    </div>
  );
}
