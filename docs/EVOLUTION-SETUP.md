# WhatsApp com Evolution API – Guia prático

## Para o cliente (tudo pelo painel do CrmPexe)

O **cliente não precisa** usar Postman, Insomnia nem linha de comando. Tudo é feito pelo painel:

1. Acesse **Integrações** no menu.
2. Crie uma integração **WhatsApp** (botão **Nova Integração** ou card do WhatsApp).
3. Escolha **API externa (Evolution) — recomendado**.
4. **Passo 1:** informe a **URL da Evolution** e o **Token** que quem instalou a Evolution te passou. Clique em **Salvar e ir para passo 2**.
5. **Passo 2** — escolha uma opção:
   - **Conectar via QR Code (Gratuito)**  
     Clique em **Gerar QR Code**. O sistema cria a instância na Evolution e mostra o QR na tela. Abra o WhatsApp no celular → Aparelhos conectados → Conectar aparelho e escaneie o QR. Se expirar, clique em **Tentar novamente**.
   - **Conectar via API Oficial (Meta)**  
     Preencha o **Token da Meta** e o **ID do número de telefone** (você obtém no [Painel de Desenvolvedores da Meta](https://developers.facebook.com/) ao criar um App do tipo Negócios e adicionar o produto WhatsApp). Clique em **Conectar via API Oficial**. O CrmPexe cria a instância e conecta.

Pronto. As conversas passam a aparecer em **Conversas**; não é preciso gerar nada fora do painel.

---

## Para quem instala a Evolution (admin / suporte)

Quem **sobe o servidor Evolution** (Docker ou hospedagem) pode testar as instâncias direto na API da Evolution com Postman, Insomnia ou Swagger. O cliente final não precisa disso.

### Teste 1: Instância via QR (Baileys)

**POST** `http://sua-evolution:8080/instance/create`

**Header:** `apikey`: sua chave da Evolution

**Body (JSON):**

```json
{
  "instanceName": "CrmPexe-NaoOficial",
  "token": "seu-token-secreto",
  "b64": false,
  "integration": "WHATSAPP-BAILEYS"
}
```

Gerar QR: **GET** `http://sua-evolution:8080/instance/connect/CrmPexe-NaoOficial` (com header `apikey`).

### Teste 2: Instância via API da Meta (oficial)

**POST** `http://sua-evolution:8080/instance/create`

**Body (JSON):**

```json
{
  "instanceName": "CrmPexe-Oficial",
  "token": "seu-token-secreto",
  "integration": "WHATSAPP-BUSINESS",
  "metaToken": "EAAL... (token da Meta)",
  "metaPhoneNumberId": "1234567890"
}
```

No CrmPexe, o cliente usa o painel (Passo 2 → Conectar via API Oficial) e o backend chama esses endpoints automaticamente; esse teste manual é só para validar a Evolution antes de passar URL e Token para o cliente.
