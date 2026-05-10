# AI Collaboration Context — Frontend Reasoning Trainer

## Why This Project Exists

This project was created after exploring the current state of:
- AI coding agents
- interview preparation
- reasoning evaluation
- frontend engineering workflows

The original idea was:
> AI mock interview system

After discussion, we intentionally narrowed the scope.

---

## Important Design Pivot

### Rejected Direction

We intentionally decided **not** to build:
- a realtime AI interviewer
- a voice-heavy system
- a cheating/copilot overlay
- a generic interview chatbot
- an AI-generated answer assistant

Reasons:
- expensive realtime cost
- weak differentiation
- generic AI wrapper risk
- shallow reasoning quality
- scope explosion

We concluded that:
> Realtime conversation is not the core value.

---

## Final Direction

### Final Product Positioning

**Frontend Reasoning Trainer**

This is:
- a structured reasoning practice workflow
- focused on engineering explanation quality
- designed for follow-up defense and reasoning calibration

Core idea:
> Train reasoning consistency, not answer generation.

---

## Key Insight

Modern LLMs are already very good at:
- generating answers
- sounding confident
- producing interview-style wording

But they are weaker at:
- maintaining reasoning consistency
- defending trade-offs
- handling follow-up pressure
- preserving architectural logic

This project focuses on those weaker areas.

---

## Product Philosophy

The project should feel like:
- an engineering practice system
- not a chatbot
- not an AI gimmick
- not a productivity wrapper

The workflow itself is the product.

---

## Important Human vs AI Boundary

The human project owner is responsible for:
- architecture decisions
- product boundaries
- evaluation philosophy
- rubric design
- reasoning quality standards

AI is responsible for:
- acceleration
- implementation support
- structured generation
- workflow assistance

Important:
> AI generation does not replace engineering judgment.

---

## Why This Project Matters

The project reflects a broader industry transition:

```txt
Frontend Engineer
→ AI-assisted Engineering Workflow
```

This is **not** abandoning frontend engineering.

This is:
- integrating AI workflows into frontend engineering
- learning orchestration
- building explainable AI systems
- designing structured workflows

---

## Important Constraint

The project must remain:
- small
- explainable
- focused
- demoable
- portfolio-friendly

If scope expands into:
- multi-agent systems
- autonomous workflows
- full SaaS platform
- realtime infrastructure
- enterprise architecture

then the project has failed its original intent.

---

## Real Differentiation

The differentiation is **not**:
- model intelligence
- realtime voice
- larger prompts

The differentiation **is**:
- structured rubric
- reasoning evaluation
- follow-up defense
- consistency tracking
- engineering-focused practice flow

---

## Why Generic ChatGPT Is Not Enough

Normal ChatGPT interaction is usually:
- session-based
- inconsistent in evaluation
- missing a fixed rubric
- not designed for practice tracking

This project aims to provide:
- a structured workflow
- a reusable evaluation pipeline
- a fixed reasoning framework
- long-term practice tracking

---

## Important Evaluation Philosophy

The system should **not** try to:
- determine a single correct answer
- behave like a strict examiner

Instead, the system should:
- detect missing reasoning parts
- identify weak explanation structure
- evaluate consistency
- guide reasoning improvement

Example:

Instead of:
> Wrong answer.

Prefer:
> You explained the intent, but not the trade-off or duplicated state risk.

---

## Architectural Philosophy

The system should:
- prefer structured JSON
- separate frontend and evaluation logic
- keep prompts server-side
- use provider abstraction
- avoid tightly coupling to one model vendor

Recommended pattern:

```txt
Frontend UI
→ Backend API
→ Evaluation Pipeline
→ LLM Adapter
→ Structured Response
```

---

## AI Collaboration Workflow

Expected workflow:

**ChatGPT**
- architecture discussion
- scope definition
- rubric design
- project planning

**Codex / Claude Code**
- implementation
- scaffolding
- refactoring
- component generation
- testing assistance

**Human**
- final decisions
- evaluation
- integration
- product direction

---

## Important Anti-Patterns

Do **not**:
- turn the app into ChatGPT with extra UI
- build fake AI features
- add complexity without clear product value
- optimize for hype instead of clarity

---

## Expected Portfolio Narrative

This project should demonstrate:
- frontend engineering thinking
- AI workflow integration
- reasoning evaluation systems
- structured async workflows
- architectural decision-making

This is intended to become:
> A portfolio project representing AI-assisted engineering workflows.

---

## Development Priority

Priority order:
1. Clear workflow
2. Stable evaluation structure
3. Explainable architecture
4. Good async UX
5. Progress tracking
6. Visual polish

Not the priority:
- fancy animations
- realtime avatars
- unnecessary AI features

---

## Final Reminder for AI Coding Agents

The purpose of this project is **not**:
- to maximize AI automation

The purpose **is**:
- to create a coherent engineering workflow
- where AI assists implementation
- while humans maintain reasoning and architectural control
