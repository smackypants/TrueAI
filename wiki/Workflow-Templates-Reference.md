# Workflow Templates Reference

> Each of the six built-in workflow templates as a Mermaid graph plus inputs/outputs.
>
> *Audience: end user · Last reviewed: 2026-05-02*

Templates live in
[`src/components/workflow/WorkflowTemplates.tsx`](https://github.com/smackypants/TrueAI/blob/main/src/components/workflow/WorkflowTemplates.tsx).
For node-type semantics see [Workflow Engine](Workflow-Engine).

Each template is a starting point — clone it from
**Workflows → Templates → Use Template** and customise to taste.

---

## 1. Content Research & Writing

**Category:** content_creation

**Inputs**

| Name | Type | Required | Default |
| --- | --- | --- | --- |
| `topic` | string | yes | — |
| `article_length` | number | no | 1000 |

**Graph**

```mermaid
flowchart LR
  S([start]) --> R[agent: Research<br/>web_search + summarizer]
  R --> A[agent: Analyze<br/>data_analyzer + sentiment]
  A --> W[agent: Write<br/>summarizer + translator]
  W --> E([end])
```

---

## 2. Data ETL Pipeline

**Category:** data_processing

**Inputs**

| Name | Type | Required | Default |
| --- | --- | --- | --- |
| `source_api` | string | yes | — |
| `target_db` | string | yes | — |

**Graph**

```mermaid
flowchart LR
  S([start]) --> X[tool: api_caller<br/>extract]
  X --> T[tool: json_parser<br/>transform]
  T --> V[tool: validator<br/>validate]
  V --> L[tool: api_caller<br/>load to target_db]
  L --> E([end])
```

---

## 3. Code Review Automation

**Category:** development

**Inputs**

| Name | Type | Required | Default |
| --- | --- | --- | --- |
| `file_path` | string | yes | — |
| `language` | string | yes | — |

**Graph**

```mermaid
flowchart LR
  S([start]) --> F[tool: file_reader]
  F --> P[/parallel\]
  P --> Q[agent: Quality Check]
  P --> Sec[agent: Security Check]
  Q --> M{merge}
  Sec --> M
  M --> R[agent: Review Report]
  R --> E([end])
```

---

## 4. Market Research Report

**Category:** research

**Inputs**

| Name | Type | Required | Default |
| --- | --- | --- | --- |
| `market` | string | yes | — |
| `competitors` | string | no | — |

**Graph**

```mermaid
flowchart LR
  S([start]) --> P[/parallel\]
  P --> Tr[agent: Trends<br/>web_search + summarizer]
  P --> Co[agent: Competitors<br/>web_search + sentiment]
  Tr --> M{merge}
  Co --> M
  M --> An[agent: Analyze + Recommend]
  An --> E([end])
```

---

## 5. Email Campaign Automation

**Category:** communication

**Inputs**

| Name | Type | Required | Default |
| --- | --- | --- | --- |
| `recipients` | string | yes | — |
| `template` | string | yes | — |

**Graph**

```mermaid
flowchart LR
  S([start]) --> G[agent: Generate per-recipient<br/>translator + summarizer]
  G --> V[tool: validator<br/>email format + length]
  V --> Send[tool: api_caller<br/>send via SMTP/HTTP]
  Send --> E([end])
```

---

## 6. Customer Support Triage

**Category:** business

**Inputs**

| Name | Type | Required | Default |
| --- | --- | --- | --- |
| `ticket_id` | string | yes | — |

**Graph**

```mermaid
flowchart LR
  S([start]) --> Get[tool: api_caller<br/>fetch ticket by id]
  Get --> Sa[tool: sentiment_analyzer]
  Sa --> D{decision<br/>route by sentiment + topic}
  D -- urgent --> Ur[agent: Escalate]
  D -- billing --> Bi[agent: Billing handler]
  D -- product --> Pr[agent: Product handler]
  D -- other --> Ot[agent: General handler]
  Ur --> E([end])
  Bi --> E
  Pr --> E
  Ot --> E
```

---

## See also

- [Workflows](Workflows) — using and editing workflows
- [Workflow Engine](Workflow-Engine) — execution semantics
- [Tools Reference](Tools-Reference) — what each `tool` node calls
- [Agents](Agents) — what each `agent` node runs
