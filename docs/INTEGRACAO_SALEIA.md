# Integração SALE-IA → SalesOS

Contrato do evento que o SALE-IA envia ao SalesOS depois de analisar uma reunião. Versão 1, definida na tarefa V2-7.1. O envio pelo SALE-IA é a tarefa V2-7.2.

## Princípios

- **O SalesOS é a fonte de verdade comercial.** O evento informa e sugere; nada muda numa negociação sem uma pessoa.
- **Uma instalação do SALE-IA alimenta uma organização do SalesOS.** O SALE-IA não tem multiempresa.
- **Entrega idempotente.** A chave é `meeting.externalId`. Reenviar a mesma reunião atualiza o registro em vez de duplicar.

## Conexão

1. No SalesOS, um administrador abre **Configurações → SALEIA → Conectar**.
2. A tela mostra o **endereço** e o **segredo**. O segredo aparece uma única vez.
3. Os dois vão para a configuração do SALE-IA, por exemplo `SALESOS_EVENTS_URL` e `SALESOS_EVENTS_SECRET`. Nunca vão para o repositório.
4. **Gerar novo segredo** invalida o anterior na hora. **Desconectar** faz os eventos serem recusados, mas as reuniões já recebidas continuam no SalesOS.

## Requisição

```
POST https://saleos.tech/api/integrations/saleia/{organizationId}/events
Content-Type: application/json
X-Saleia-Timestamp: 1762430400
X-Saleia-Signature: sha256=<hex>
```

- `X-Saleia-Timestamp`: segundos desde 1970 (Unix), em UTC. A diferença para o relógio do SalesOS pode ser de no máximo 300 segundos.
- `X-Saleia-Signature`: `sha256=` seguido do HMAC-SHA256, em hexadecimal, de `"{timestamp}.{corpo}"`, usando o segredo como chave. O corpo é exatamente o texto enviado, byte a byte.
- O corpo tem no máximo 256 KB.

## Corpo (versão 1)

```json
{
  "version": 1,
  "event": "meeting.analyzed",
  "eventId": "7f0c...-uuid",
  "occurredAt": "2026-11-06T15:02:00Z",
  "meeting": {
    "externalId": "4812",
    "title": "Reunião de diagnóstico - Acme",
    "startedAt": "2026-11-06T14:00:00Z",
    "durationMinutes": 52,
    "participants": [
      { "name": "Ana Souza", "email": "ana@acme.com.br" },
      { "name": "Carlos (vendedor)" }
    ],
    "summary": "Texto do resumo da análise..."
  },
  "links": {
    "opportunityId": null,
    "companyName": "Acme"
  },
  "insights": [
    { "kind": "RECOMMENDATION", "text": "Enviar proposta revisada até sexta", "dueDate": "2026-11-07T12:00:00Z" },
    { "kind": "OBJECTION", "text": "Preço acima do orçamento", "quote": "Está caro para nós agora" },
    { "kind": "BUYING_SIGNAL", "text": "Pediu prazo de implantação" },
    { "kind": "PAIN", "text": "Processo comercial manual" },
    { "kind": "EVIDENCE", "text": "Tem orçamento aprovado para o 1º trimestre" },
    { "kind": "STAGE_SUGGESTION", "text": "Cliente pediu proposta formal", "stageName": "Proposta" }
  ]
}
```

| Campo | Regra |
|---|---|
| `version` | Sempre `1` |
| `event` | Sempre `meeting.analyzed` |
| `eventId` | Até 100 caracteres. Serve para rastrear a entrega; quem garante a idempotência é `meeting.externalId` |
| `occurredAt` | Data ISO 8601 em que a análise terminou |
| `meeting.externalId` | Id da reunião no SALE-IA, até 100 caracteres |
| `meeting.title` | Até 200 caracteres |
| `meeting.startedAt` | Data ISO 8601 |
| `meeting.durationMinutes` | Inteiro de 0 a 1440, ou `null` |
| `meeting.participants` | Até 50, cada um com `name` e `email` opcional |
| `meeting.summary` | Até 20.000 caracteres |
| `links.opportunityId` | Id da negociação no SalesOS, se o SALE-IA souber; opcional |
| `links.companyName` | Nome da empresa; opcional |
| `insights` | Até 50. `kind` pode ser `RECOMMENDATION`, `OBJECTION`, `BUYING_SIGNAL`, `PAIN`, `EVIDENCE` ou `STAGE_SUGGESTION`. `text` é obrigatório (até 2.000). `quote` (até 2.000) e `dueDate` são opcionais. `STAGE_SUGGESTION` exige `stageName` |

## Como o SalesOS liga a reunião ao CRM

O SalesOS tenta, nesta ordem:

1. **Negociação informada** em `links.opportunityId`, se for da organização. Empresa e contato vêm dela.
2. **Contato** cujo e-mail coincide com o de um participante, sem diferenciar maiúsculas. A empresa vem do contato.
3. **Empresa** com o nome em `links.companyName`, sem diferenciar maiúsculas.

Sem negociação informada, a reunião só é ligada a uma negociação quando a empresa tem exatamente uma negociação em andamento. Se nada coincidir, a reunião fica "sem empresa", visível para gestor e administrador em `/saleia`.

## Respostas

| Status | Quando |
|---|---|
| `201` | Reunião nova gravada |
| `200` | Reunião já existente atualizada |
| `400` | JSON inválido, campo fora do contrato ou corpo acima de 256 KB. Não adianta reenviar sem corrigir |
| `401` | Assinatura ausente ou errada, timestamp fora da janela, organização inexistente ou integração desconectada |
| `500` | Erro inesperado. Pode reenviar |

Corpo de sucesso:

```json
{
  "meetingId": "cm...",
  "created": true,
  "linked": { "opportunityId": "cm...", "companyId": "cm...", "contactId": "cm...", "via": "contact" }
}
```

O campo `via` pode ser `opportunity`, `contact`, `company` ou `null`. Os erros seguem o formato `{ "error", "code", "fields"? }` do SalesOS.

## Reenvio

- Reenvie com espera crescente (por exemplo 1, 5 e 30 minutos) em caso de `500` ou de falha de rede. Não reenvie depois de `400` nem de `401`.
- Cada reenvio precisa de timestamp e assinatura novos.
- Reenviar uma reunião reanalisada substitui o resumo, os participantes, o vínculo e os insights ainda não decididos por uma pessoa. Insights aceitos ou descartados no SalesOS (V2-7.3) são mantidos.

## Exemplo em Python (SALE-IA)

```python
import hashlib, hmac, json, time
import httpx

def enviar_reuniao(url: str, segredo: str, evento: dict) -> httpx.Response:
    corpo = json.dumps(evento, ensure_ascii=False, separators=(",", ":"))
    timestamp = str(int(time.time()))
    assinatura = hmac.new(segredo.encode(), f"{timestamp}.{corpo}".encode(), hashlib.sha256).hexdigest()
    return httpx.post(
        url,
        content=corpo.encode(),
        headers={
            "Content-Type": "application/json",
            "X-Saleia-Timestamp": timestamp,
            "X-Saleia-Signature": f"sha256={assinatura}",
        },
        timeout=15,
    )
```

## Privacidade

O SalesOS guarda o resumo, os participantes (nome e e-mail) e os trechos citados. A transcrição completa não é enviada nem guardada. O segredo fica criptografado no banco e não entra em logs nem no `AuditLog`.
