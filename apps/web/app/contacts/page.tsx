"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { Button } from "@/components/ui/button";

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type Company = {
  id: string;
  name: string;
};

type Contact = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  companyId?: string | null;
  company?: Company | null;
  customFields?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

type ContactFormState = {
  name: string;
  email: string;
  phone: string;
  companyId: string;
  customFields: string;
};

const emptyForm: ContactFormState = {
  name: "",
  email: "",
  phone: "",
  companyId: "",
  customFields: ""
};

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formState, setFormState] = useState<ContactFormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${apiUrl}/api/contacts`, {
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error("Não foi possível carregar os contatos.");
      }

      const data = (await response.json()) as Contact[];
      setContacts(data);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Erro inesperado ao carregar contatos.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCompanies = useCallback(async () => {
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
    }
  }, []);

  useEffect(() => {
    void fetchContacts();
    void fetchCompanies();
  }, [fetchCompanies, fetchContacts]);

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
    (field: keyof ContactFormState) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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
      email: formState.email || null,
      phone: formState.phone || null,
      companyId: formState.companyId || null,
      customFields: parsedCustomFields
    };

    try {
      const response = await fetch(`${apiUrl}/api/contacts${editingId ? `/${editingId}` : ""}`,
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
        throw new Error("Não foi possível salvar o contato.");
      }

      resetForm();
      await fetchContacts();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Erro inesperado ao salvar contato.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (contact: Contact) => {
    setEditingId(contact.id);
    setFormState({
      name: contact.name,
      email: contact.email ?? "",
      phone: contact.phone ?? "",
      companyId: contact.companyId ?? "",
      customFields: contact.customFields ? JSON.stringify(contact.customFields, null, 2) : ""
    });
  };

  const handleDelete = async (contactId: string) => {
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`${apiUrl}/api/contacts/${contactId}`, {
        method: "DELETE",
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error("Não foi possível remover o contato.");
      }

      await fetchContacts();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Erro inesperado ao remover contato.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      <header className="border-b bg-white px-6 py-6 shadow-sm">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2">
          <p className="text-sm font-medium text-blue-600">Contatos</p>
          <h1 className="text-2xl font-semibold text-gray-900">
            Cadastre pessoas e vincule contatos às empresas
          </h1>
          <p className="text-sm text-gray-500">
            Centralize dados de relacionamento e associe cada contato a uma empresa do workspace.
          </p>
          <div className="mt-3 flex gap-3">
            <Link href="/dashboard">
              <Button variant="outline">Voltar ao dashboard</Button>
            </Link>
            <Link href="/companies">
              <Button variant="outline">Ver empresas</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10 lg:flex-row">
        <section className="flex-1 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">Contatos cadastrados</h2>
            <Button variant="outline" onClick={fetchContacts} disabled={loading}>
              Atualizar lista
            </Button>
          </div>

          {loading ? (
            <div className="rounded-xl border bg-white p-6 text-sm text-gray-500 shadow-sm">
              Carregando contatos...
            </div>
          ) : contacts.length === 0 ? (
            <div className="rounded-xl border bg-white p-6 text-sm text-gray-500 shadow-sm">
              Nenhum contato cadastrado ainda. Use o formulário ao lado para criar o primeiro.
            </div>
          ) : (
            <div className="grid gap-4">
              {contacts.map((contact) => (
                <div key={contact.id} className="rounded-xl border bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{contact.name}</h3>
                      <p className="text-sm text-gray-500">
                        {contact.email ? contact.email : "Email não informado"}
                      </p>
                      <p className="text-sm text-gray-500">
                        {contact.phone ? contact.phone : "Telefone não informado"}
                      </p>
                      <p className="text-sm text-gray-500">
                        {contact.company?.name
                          ? `Empresa: ${contact.company.name}`
                          : "Empresa não vinculada"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => handleEdit(contact)}>
                        Editar
                      </Button>
                      <Button
                        className="bg-red-600 hover:bg-red-700"
                        onClick={() => handleDelete(contact.id)}
                        disabled={submitting}
                      >
                        Remover
                      </Button>
                    </div>
                  </div>
                  <div className="mt-4 rounded-lg bg-gray-50 px-4 py-3 text-xs text-gray-600">
                    <p className="font-semibold text-gray-700">Custom fields</p>
                    <pre className="mt-2 whitespace-pre-wrap text-xs text-gray-600">
                      {contact.customFields ? JSON.stringify(contact.customFields, null, 2) : "Nenhum campo adicional."}
                    </pre>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <aside className="w-full max-w-md rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800">
            {editingId ? "Editar contato" : "Novo contato"}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Cadastre dados básicos e selecione a empresa relacionada.
          </p>
          <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700" htmlFor="contact-name">
                Nome do contato
              </label>
              <input
                id="contact-name"
                type="text"
                value={formState.name}
                onChange={handleChange("name")}
                placeholder="Ex: Mariana Costa"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700" htmlFor="contact-email">
                Email
              </label>
              <input
                id="contact-email"
                type="email"
                value={formState.email}
                onChange={handleChange("email")}
                placeholder="maria@empresa.com"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700" htmlFor="contact-phone">
                Telefone
              </label>
              <input
                id="contact-phone"
                type="text"
                value={formState.phone}
                onChange={handleChange("phone")}
                placeholder="+55 11 98888-0000"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700" htmlFor="contact-company">
                Empresa vinculada
              </label>
              <select
                id="contact-company"
                value={formState.companyId}
                onChange={handleChange("companyId")}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Nenhuma empresa</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
              {companies.length === 0 && (
                <p className="text-xs text-gray-500">Cadastre empresas para vinculá-las aos contatos.</p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700" htmlFor="contact-custom-fields">
                Custom fields (JSON)
              </label>
              <textarea
                id="contact-custom-fields"
                value={formState.customFields}
                onChange={handleChange("customFields")}
                placeholder='{"cargo": "Gerente", "origem": "Inbound"}'
                rows={5}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
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
                {submitting ? "Salvando..." : editingId ? "Atualizar contato" : "Criar contato"}
              </Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        </aside>
      </main>
    </div>
  );
}
