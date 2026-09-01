# TILLU UI/UX MASTER SPECIFICATION

### The interface should feel like a **Personal Study Operating System**, not a dashboard full of widgets.

# TILLU — UI/UX MASTER SPECIFICATION

**Product:** Tillu
**Purpose:** Personal Autonomous Study Environment for a Class 12 CBSE student
**Design Goal:** Make Tillu feel like a persistent study companion whose UI understands context, learning state, time, browser activity, revision needs, and academic progress.

---

# 1. THE CORE UI IDEA

Tillu should have three layers:

```text
┌─────────────────────────────────────────────────────────┐
│                     TILLU OS                            │
│                                                         │
│  STUDY SPACE                 LIVE COMPANION             │
│  • plans                     • Tillu Chat               │
│  • learning                 • recommendations          │
│  • revision                 • browser context          │
│  • tests                    • actions                  │
│  • progress                 • voice                    │
│                                                         │
│                     DATA + STATE                        │
│  Student State • Mastery • Memory • Events • Health     │
└─────────────────────────────────────────────────────────┘
```

The UI should always answer:

**Where am I?**
**What should I do?**
**Why am I doing it?**
**How much time do I need?**
**Am I improving?**
**What did I forget?**
**What does Tillu know about my learning?**
**What is Tillu doing in the background?**

---

# 2. GLOBAL UI SHELL

Every major Tillu screen uses the same shell.

```text
┌────────────────────────────────────────────────────────────────┐
│ ☰  TILLU        Search…        🧠 State     🔔      ⚙         │
├─────────────┬──────────────────────────────────────────────────┤
│             │                                                  │
│ HOME        │                                                  │
│ PLAN        │                 MAIN CONTENT                     │
│ STUDY       │                                                  │
│ REVISION    │                                                  │
│ TESTS       │                                                  │
│ LECTURES    │                                                  │
│ RESEARCH    │                                                  │
│ PROGRESS    │                                                  │
│ MISTAKES    │                                                  │
│ FORMULAS    │                                                  │
│             │                                                  │
│ ─────────   │                                                  │
│ TILLU CHAT  │                               ┌─────────────────┐  │
│             │                               │ TILLU SIDEBAR  │  │
│ More        │                               │                 │  │
│             │                               │ Chat / Context │  │
└─────────────┴──────────────────────────────┴─────────────────┘
```

### Desktop

Three zones:

**Left:** navigation
**Center:** current workspace
**Right:** persistent Tillu companion

### Tablet

Left navigation collapses.

### Mobile

Bottom navigation + floating Tillu button.

---

# 3. THE TILLU CHAT SIDEBAR

This is one of the most important parts of the entire product.

The sidebar is **not merely a chatbot**.

It is the **contextual control panel for Tillu**.

```text
┌─────────────────────────────┐
│ 🧠 Tillu                    │
│                             │
│ Context: Ray Optics         │
│ Session: 28 min             │
│                             │
│ "You're working on lens     │
│  formula applications."     │
│                             │
│ ─────────────────────────── │
│                             │
│ You: why am I doing this?   │
│                             │
│ Tillu: Your recall has      │
│ dropped to 48%, and this    │
│ concept is due for review.  │
│                             │
│ Suggested actions:          │
│ [Explain] [Quiz me]         │
│ [Give hint] [Skip]          │
│                             │
│ ─────────────────────────── │
│ Ask Tillu…             🎙️  │
└─────────────────────────────┘
```

## The sidebar should understand page context.

On the Revision page:

> "Why is this revision due?"

On a question:

> "Give me a hint."

On YouTube:

> "Summarize this lecture."

On the Plan page:

> "Why did you move this task?"

On Progress:

> "What is causing my Physics weakness?"

On Research:

> "Check whether this source is reliable."

The user should not need to explain context repeatedly.

---

# 4. TILLU CHAT MODES

Tillu Chat supports:

### Normal Mode

General conversation.

### Study Mode

Focused academic help.

### Tutor Mode

Socratic teaching.

### Research Mode

Multi-source research.

### Exam Mode

No unnecessary assistance.

### Revision Mode

Recall-focused interaction.

### Planning Mode

Schedule discussion.

### Browser Mode

Talk about the currently open browser page.

### System Mode

Ask about Tillu itself.

---

# 5. CHAT ACTION BAR

Below the chat:

```text
＋ Attach
🎙 Voice
📸 Capture
📄 Ask about page
🧠 Quiz
🔁 Revise
🔎 Research
▶ Continue lecture
```

Contextual buttons change based on current activity.

---

# 6. TILLU COMMAND BAR

Global keyboard shortcut:

```text
Ctrl/Cmd + K
```

opens:

**Ask Tillu anything**

Examples:

```text
"what should I study?"
"make today lighter"
"test me on electrochemistry"
"why is integration weak?"
"start my next lecture"
"show what I forgot this week"
"research this topic"
```

Tillu can turn natural language into actions.

---

# 7. HOME — TILLU COMMAND CENTER

Home should be the most intelligent screen.

### Primary card:

# NEXT BEST ACTION

```text
Physics — Ray Optics
8 PYQs • 35 min

Why:
🔴 Weak concept
🔴 Revision due
🟡 3 recent mistakes

Expected outcome:
Improve lens-application recall

[ START ]
```

Secondary information:

```text
TODAY
Study        2h 14m
Revision      42m
Quiz           8/10
Plan          72%

FORGETTING RADAR
🔴 Integration
🔴 Ray Optics
🟡 Electrochemistry

SYSTEM
🟢 Tillu Healthy
```

---

# 8. HOME — LIVE STATE

A small live status area:

```text
🟢 Available
🎯 Recommended focus: Physics
⏱ Estimated free window: 48 min
```

It should change dynamically.

Examples:

```text
🎥 Watching lecture
🧠 In study session
💤 Quiet hours
🟡 Away
```

---

# 9. HOME — "TILLU THINKING"

When Tillu is actively processing:

```text
Tillu is preparing your next move…

✓ Checked revision
✓ Checked deadlines
✓ Checked recent mistakes
✓ Checked available time
✓ Selected highest-value task
```

Do not expose hidden reasoning. Show only concise action-oriented explanations.

---

# 10. DAILY PLAN PAGE

The Plan screen should not look like a generic calendar.

Use:

## Timeline + Intelligence

```text
08:00  School                    FIXED
16:30  Physics PYQs              HIGH
17:05  Break
17:20  Chemistry Recall          HIGH
18:00  Maths Quiz                NORMAL
20:00  Formula Recall             OPTIONAL
```

Each task has:

* duration
* priority
* reason
* expected learning value
* completion
* flexibility

---

# 11. PLAN DETAILS

Tap a task:

```text
Physics — Ray Optics
35 minutes

Purpose:
Repair weak lens-formula application

Evidence:
• mastery 48%
• 3 recent errors
• revision overdue

Success condition:
6/8 PYQs correct

[Start]
[Move]
[Shorten]
[Skip]
[Ask Tillu]
```

---

# 12. PLAN ADAPTATION UI

When the plan changes:

```text
PLAN UPDATED

You lost 55 minutes this afternoon.

Tillu protected:
✓ Physics revision
✓ Tomorrow's test

Moved:
→ Formula revision

Removed:
→ Low-value rereading

Your important goals still fit.
```

Always explain major changes.

---

# 13. STUDY HUB

Study is the main workspace.

```text
STUDY

Continue
├─ Current lecture
├─ Current session
└─ Next task

Learn
├─ Subjects
├─ Chapters
├─ Concepts
└─ Tutor

Practice
├─ Questions
├─ PYQs
├─ Quizzes
└─ Mocks
```

---

# 14. SUBJECT PAGE

Example:

```text
PHYSICS

Coverage       84%
Mastery        69%
Recall         63%
PYQ            72%

Chapters

Electrostatics        82% 🟢
Current Electricity   91% 🟢
Magnetism             61% 🟡
EMI                   52% 🔴
Optics                47% 🔴
Modern Physics        89% 🟢
```

Tap a chapter to see concept-level intelligence.

---

# 15. CHAPTER PAGE

```text
Ray Optics

Coverage: 100%
Mastery: 48%
Recall: 42%
PYQ: 57%

Concepts

Lens Formula          71%
Sign Convention       39% 🔴
Magnification         74%
Optical Instruments   53%

Revision:
3 due

Mistakes:
7

[Study Chapter]
[Repair Weakness]
[Test Chapter]
```

---

# 16. CONCEPT PAGE

This is the deepest academic page.

```text
Sign Convention

Mastery: 39% 🔴
Confidence: 46%

Learned:
Aug 21

Last successful recall:
Aug 27

Recent evidence:
❌ PYQ
❌ Quiz
✅ Easy recall

Common mistake:
Wrong sign assignment

Next:
10-minute repair session
```

Tabs:

```text
Overview
Learn
Recall
Practice
Mistakes
History
```

---

# 17. REVISION CENTER

This must feel premium.

Header:

```text
🧠 REVISION CENTER

Due now: 7
At risk: 4
Stable: 23
Strong: 61
```

Sections:

```text
🔴 DO NOW
🟠 REPAIR
🟡 DUE SOON
🟢 MAINTAIN
```

---

# 18. REVISION QUEUE

Each card:

```text
Integration
Due: now

Reason:
High forgetting risk

Best revision:
Recall + 4 PYQs

Estimated:
18 min

[Start]
```

The Revision Manager should continuously reorder this queue.

---

# 19. FORGETTING RADAR

Dedicated visual page:

```text
WHAT YOU ARE LIKELY TO FORGET

🔴 Critical
Integration techniques
Sign convention
Organic reaction conditions

🟠 At risk
Electrochemistry
Matrices

🟡 Watch
Probability
```

Clicking a topic opens its evidence.

---

# 20. REVISION SESSION

Three-step layout:

```text
RECALL
   ↓
VERIFY
   ↓
STRENGTHEN
```

Example:

> Write the lens formula from memory.

Student responds.

Tillu assesses.

Then:

```text
✓ Correct

Now explain what each term means.
```

Then a question.

---

# 21. MIXED RECALL MODE

One of Tillu's signature features:

```text
RANDOM RECALL

Physics:
Gauss's law

Maths:
Integration identity

Chemistry:
Nernst equation
```

This creates exam-like retrieval.

---

# 22. MISTAKE BANK

Main page:

```text
MISTAKE BANK

Total: 37

Recurring patterns:

🔴 Sign errors        8
🔴 Formula selection  6
🟠 Misreading         5
🟠 Calculation        4
🟡 Units              3
```

---

# 23. MISTAKE DETAIL

```text
WHY YOU KEEP LOSING MARKS

Pattern:
Sign Convention

Occurrences:
4

Last 3 attempts:

❌ ❌ ❌

Probable cause:
Concept not stable under pressure

Tillu action:
Create repair session

[Repair Now]
```

---

# 24. QUIZ CENTER

```text
QUIZZES

Daily Quiz             Ready
Weakness Quiz          Ready
Revision Quiz          7 due
PYQ Quiz               Available
Mixed Quiz             Available
```

Quiz cards show:

* purpose
* estimated time
* difficulty
* concepts
* reason

---

# 25. DAILY QUIZ EXPERIENCE

Before starting:

```text
TODAY'S QUIZ

10 questions
15 minutes

Selected because:
• 4 revision items are due
• 2 recent mistakes
• 1 weak concept

Mode:
○ Learning
○ Recall
○ Exam
```

---

# 26. QUESTION UI

Minimal interface.

```text
Question 4/10

A lens produces...

[Answer]

[Submit]

Need help?
Hint
Ask Tillu
```

Do not overload the screen.

---

# 27. QUIZ RESULTS

Not just:

> 8/10.

Show:

```text
8/10

Concept performance

Lens formula        100%
Sign convention      50%
Magnification         75%

Mistakes:
2 conceptual
1 calculation

Tillu updated:
✓ mastery
✓ revision
✓ mistake bank

Recommended:
12-minute repair
```

---

# 28. EXAM CENTER

Sections:

```text
Chapter Tests
Subject Tests
PYQs
Mock Exams
Practice Sets
Timed Drills
```

---

# 29. EXAM MODE UI

Very clean.

```text
TIME LEFT: 02:14:32

Question 14/38

[question]

Mark for review
Previous
Next

────────────────
Answered: 13
Review: 4
Remaining: 21
```

No AI hints unless explicitly allowed.

---

# 30. POST-EXAM ANALYSIS

This is a major premium feature.

```text
TEST ANALYSIS

Score: 62%

But your real issue was:

Knowledge: 🟡
Accuracy: 🟢
Speed: 🔴
Exam execution: 🔴

Lost marks:
Concept: 12
Calculation: 5
Time: 8
Presentation: 3
```

Then:

**Tillu creates a recovery plan.**

---

# 31. FORMULA VAULT

```text
FORMULA VAULT

Physics
 ├─ Mechanics
 ├─ Electrostatics
 ├─ Current
 └─ Optics

Chemistry
Maths
```

Every formula supports:

```text
View
Recall
Explain
Practice
Favorite
```

But **Recall** should be the primary action.

---

# 32. REACTION VAULT

Especially useful for Chemistry.

Each reaction:

```text
Reactant
Condition
Product
Mechanism/Note
Common mistake
Recall status
```

---

# 33. LECTURE HUB

```text
LECTURES

Continue Watching
─────────────────
Physics — Ray Optics
Lecture 4
37:42 / 52:19

[Continue]

Your Playlists
─────────────────
Physics
Chemistry
Maths
```

---

# 34. LECTURE PLAYER + TILLU

This is where your idea becomes special.

When Chromium opens:

```text
┌──────────────────────────────────────────────────────────┐
│ Chrome                                                   │
│                                                          │
│ YouTube Lecture                    TILLU SIDEBAR         │
│                                                          │
│   VIDEO                             ┌──────────────────┐ │
│                                    │ 🧠 Tillu         │ │
│                                    │                  │ │
│                                    │ Ray Optics       │ │
│                                    │ Lecture 4        │ │
│                                    │                  │ │
│                                    │ Progress 71%     │ │
│                                    │                  │ │
│                                    │ Ask about this   │ │
│                                    │ lecture…         │ │
│                                    │                  │ │
│                                    │ [Quiz me]        │ │
│                                    │ [Summarize]      │ │
│                                    │ [Explain]        │ │
│                                    │ [Notes]          │ │
│                                    └──────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

---

# 35. BROWSER CONTEXT BRIDGE

The Tillu local agent should tell Tillu Cloud:

```text
current_url
page_title
domain
video_id
playlist
playback_position
active_tab
```

Only permitted information.

Then Tillu Sidebar can understand:

> "I'm currently watching this."

---

# 36. CHROMIUM → TILLU CHAT

Student can select text on a webpage:

**Ask Tillu**

Then:

```text
Selected:
"electric potential"

Tillu:
Would you like:

[Explain simply]
[Board answer]
[Quiz me]
[Add to revision]
[Add to notes]
```

---

# 37. VIDEO CONTEXT ACTIONS

During a lecture:

```text
Ask Tillu:
"what did he mean here?"
```

Tillu receives:

```text
lecture
timestamp
title
chapter
optional transcript/context
```

Then answers in context.

---

# 38. TIMESTAMP MEMORY

A powerful feature:

```text
03:41 — Lens formula introduced
07:18 — Sign convention
14:32 — Example problem
28:50 — Important derivation
```

Tillu can automatically build lecture bookmarks.

---

# 39. SMART LECTURE NOTES

After the lecture:

```text
LECTURE NOTES

Key ideas
• ...

Important formulas
• ...

Mistakes to avoid
• ...

Questions to revisit
• ...

Bookmarks
03:41
07:18
14:32
```

Do not dump an enormous AI transcript.

---

# 40. LECTURE → REVISION

When the lecture ends:

```text
Lecture Complete

Exposure recorded.

Before I mark this concept as stronger,
let's test your recall.

[5-minute recall]
```

This maintains the principle:

**watching ≠ mastery.**

---

# 41. RESEARCH HUB

Research home:

```text
RESEARCH

New research
Saved research
CBSE research
My topics

Recent:
"Physics board preparation"
"Electrochemistry important concepts"
```

---

# 42. RESEARCH WORKSPACE

Three panels:

```text
QUESTION
   │
   ├── Sources
   ├── Claims
   └── Answer
```

Show provenance.

```text
Claim:
...

Sources:
✓ CBSE
✓ Academic source
⚠ Secondary source

Confidence:
HIGH
```

---

# 43. RESEARCH → STUDY BRIDGE

Every useful research result can become:

```text
[Save to Knowledge]
[Create Quiz]
[Create Revision]
[Add to Notes]
[Make Flashcards]
[Ask Tutor]
```

This turns research into learning.

---

# 44. PROGRESS CENTER

Progress is split into:

```text
Academic
Learning
Revision
Exam
Study Habits
```

---

# 45. ACADEMIC DASHBOARD

```text
BOARD PREPARATION

Syllabus       92%
Coverage       88%
Mastery        71%
Recall         67%
PYQs           75%
Mocks          63%
```

Use trends rather than only static numbers.

---

# 46. MASTERY MAP

Visual concept map:

```text
Physics
 │
 ├── Electrostatics       🟢
 │     ├── Field          🟢
 │     └── Potential      🟡
 │
 ├── Optics               🔴
 │     ├── Lens           🟡
 │     ├── Sign           🔴
 │     └── Instruments    🟡
```

---

# 47. STUDY ANALYTICS

Track:

```text
Hours studied
Focused time
Passive time
Questions solved
Recall sessions
Revision adherence
Quiz accuracy
Repeated mistakes
```

But never optimize only for hours.

---

# 48. LEARNING EFFICIENCY

A premium feature:

```text
1 hour spent
      ↓
what did it produce?
```

Example:

```text
45m Physics

+ 2 concepts learned
+ 1 weakness repaired
+ 8 PYQs
+ 81% recall
```

This is more valuable than:

> "45 minutes studied."

---

# 49. WEEKLY INTELLIGENCE REPORT

```text
YOUR WEEK

Study: 21h 14m

Mastery:
+6%

Recall:
+8%

Repeated mistakes:
-17%

Best subject:
Chemistry

Weakest:
Physics

Tillu recommendation:
Increase Physics application practice.
Reduce passive lecture time by 30m/week.
```

---

# 50. BOARD READINESS

The page should answer:

> "How ready am I?"

Dimensions:

```text
Syllabus coverage
Concept mastery
Recall strength
PYQ skill
Mock performance
Time management
Answer writing
Revision health
```

---

# 51. "WHAT SHOULD I FIX FIRST?"

A powerful priority page.

```text
TOP 10 HIGHEST-VALUE IMPROVEMENTS

1. Integration technique selection
2. Ray Optics sign convention
3. Electrochemistry recall
4. Maths time management
...
```

Each item has:

```text
Impact
Difficulty
Estimated time
```

---

# 52. TILLU BRAIN PAGE

Advanced screen showing system understanding.

```text
TILLU BRAIN

Student
├── Current state
├── Goals
├── Available time
├── Learning profile
├── Weaknesses
├── Memory
└── Preferences

Current reasoning state:
Planning next revision cycle
```

Also:

```text
Active agents
Planner        🟢
Revision       🟢
Quiz           🟢
Research       🟢
Sentinel       🟢
```

---

# 53. SYSTEM HEALTH

```text
TILLU HEALTH

Core             🟢
Database         🟢
Planner          🟢
Revision         🟢
Quiz             🟢
Research         🟡
Local Agent      🟢
Automation       🟢

Last test:
2 minutes ago
```

---

# 54. AGENT DETAIL

Tap an agent:

```text
REVISION MANAGER

Status:
🟢 Healthy

Version:
1.4.2

Last successful job:
2m ago

Synthetic test:
Passed

Latency:
810ms

Failures:
0 today
```

---

# 55. SETTINGS

Sections:

```text
Account
Subjects
Study Preferences
Availability
Sleep
Notifications
AI Models
Browser
Privacy
Local Agent
Automation
Data
System
```

---

# 56. PRIVACY CENTER

Show clearly:

```text
What Tillu can see:
✓ Study sessions
✓ Tillu activity
✓ Approved browser context

What Tillu cannot see:
✗ Passwords
✗ Private browser tabs
✗ Webcam
✗ Microphone
✗ Files outside allowed folders
```

Unless explicitly enabled.

---

# 57. BROWSER PERMISSIONS

```text
LOCAL AGENT

Status: Connected

Allowed:
✓ YouTube
✓ Approved playlists

Blocked:
✗ Banking
✗ Password manager
✗ Arbitrary downloads

[Disable Local Agent]
[Emergency Stop]
```

---

# 58. NOTIFICATION CENTER

Instead of hundreds of messages:

```text
TILLU NOTIFICATIONS

Today

🔴 Revision due
🟡 Plan changed
🟢 Quiz ready
ℹ️ Weekly report ready
```

---

# 59. SMART NOTIFICATION PREVIEW

Before sending:

```text
Student:
AVAILABLE ✅

Notification:
"Ray Optics revision is due."

Priority:
HIGH

Reason:
Weakness + forgetting risk
```

This can be part of Sentinel/Notification debugging.

---

# 60. CALENDAR VIEW

Not just events.

Calendar overlays:

```text
Study
Revision
Tests
Deadlines
Lectures
Exams
```

Color by activity category, but maintain accessibility for color-blind users.

---

# 61. TIME MACHINE

A premium feature:

> **"Show me what Tillu knew about me one month ago."**

View:

```text
Aug 1
Maths mastery: 54%

Aug 15
Maths mastery: 63%

Aug 31
Maths mastery: 74%
```

Also show:

> "Your improvement came mainly from PYQ practice."

---

# 62. "WHY?" EVERYWHERE

Every AI-driven recommendation should expose a compact explanation.

Example:

```text
Why is this first?

• revision overdue
• weak mastery
• high exam importance
• fits your available 40 min
```

Never expose private chain-of-thought.

Expose **evidence and decision factors**.

---

# 63. "UNDO TILLU"

Any major automated action:

```text
Plan changed
Revision rescheduled
Task moved
```

provides:

**Undo**

This is essential for trust.

---

# 64. COMMAND PALETTE

Global:

```text
⌘/Ctrl + K
```

Commands:

```text
Start next task
Open revision
Quiz me
Start lecture
Research topic
Show weaknesses
Build today's plan
Show missed work
Start focus mode
Open mistake bank
Check Tillu health
```

---

# 65. VOICE INTERFACE

Global microphone:

> "Tillu, test me on aldehydes."

Tillu immediately enters quiz mode.

> "Tillu, start my Physics lecture."

Local Agent starts Chromium.

> "Tillu, I only have 25 minutes."

Planner recalculates.

---

# 66. NATURAL-LANGUAGE ACTIONS

The chat should understand:

```text
"Make today easier."

"Move Physics to tomorrow."

"Give me only important questions."

"I have 20 minutes."

"I'm tired."

"I don't want to study Maths right now."

"Test me on what I studied yesterday."

"Show everything I keep forgetting."
```

The system must translate these into structured actions.

---

# 67. PRESENCE UX

Tillu should not expose invasive monitoring.

Display:

```text
🟢 AVAILABLE
```

or:

```text
🧠 STUDYING
```

but not:

> "We know exactly where you are."

---

# 68. CONTEXTUAL PRESENCE

When studying:

```text
STUDYING

Tillu is quiet.
Tracking:
✓ session
✓ questions
✓ lecture progress
```

When away:

```text
AWAY

Tillu is holding your plan.
No urgent action needed.
```

When returning:

```text
WELCOME BACK

Your next best action:
Physics — 35 min
```

---

# 69. FOCUS MODE

Focus Mode should hide:

```text
notifications
unnecessary dashboard elements
social distractions
```

Keep only:

```text
current task
timer
Tillu help
progress
```

---

# 70. DEEP WORK MODE

For 45–120 minute sessions:

```text
Session objective
Timer
Minimal UI
Question workspace
Tillu hidden until requested
```

---

# 71. MICRO-STUDY MODE

When you have little time:

```text
You have 9 minutes.

Best use:
5 formula recalls
+
1 mistake retry

[START]
```

---

# 72. "I HAVE X MINUTES" MODE

User enters:

> "I have 17 minutes."

Tillu immediately generates a session.

```text
17 minutes

Choose:
1. 10-question recall
2. 5 weak formulas
3. 3 PYQs
```

Then automatically selects the best option.

---

# 73. RECOVERY MODE

If the student returns after missing the day:

```text
YOU'RE BACK

No problem.

Yesterday's unfinished work:
7 tasks

Tillu condensed this to:
3 high-value tasks

Estimated recovery:
1h 40m
```

Never dump the entire backlog.

---

# 74. WEEKEND MODE

Tillu can switch automatically or manually:

```text
WEEKEND

Deep work:
Mock test
Weak chapter repair
Backlog cleanup
```

---

# 75. EXAM APPROACH MODE

As exams approach, the UI changes priorities:

```text
LEARNING
→
REVISION
→
PYQ
→
MOCK
→
EXAM EXECUTION
```

The Home screen should dynamically reflect this.

---

# 76. EMERGENCY STUDY MODE

When a student is behind:

```text
EXAM PRESSURE

Current state:
3 chapters at risk

Tillu has simplified your plan.

Priority:
1. High-value chapters
2. Known weak concepts
3. PYQs
4. Critical revision
```

Avoid unrealistic "study everything" plans.

---

# 77. PERSONAL KNOWLEDGE GRAPH

A visually rich advanced page:

```text
                    Physics
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
     Electrostatics   Optics      Magnetism
          │             │
       Potential      Lens
                       │
                 Sign Convention 🔴
```

Click any node → concept page.

---

# 78. SEARCH

Global search must search:

```text
Subjects
Chapters
Concepts
Questions
Mistakes
Lectures
Research
Notes
Formulas
Study sessions
Plans
```

Natural-language search:

> "things I keep getting wrong in physics"

should return mistake patterns.

---

# 79. SMART SEARCH

Examples:

> "everything about integration"

→ concept + notes + mistakes + quizzes + lectures + revision.

> "what I studied Tuesday"

→ historical activity.

> "show my weak chemistry topics"

→ mastery + mistakes.

---

# 80. NOTES SYSTEM

Do not build a generic document editor only.

Use **learning-aware notes**.

Note types:

```text
Master Note
Revision Note
Mistake Note
Lecture Note
Research Note
Formula Note
```

Each note can link to concepts.

---

# 81. KNOWLEDGE CAPTURE

From any page:

```text
[Save to Tillu]
```

Then:

```text
Save as:
Knowledge
Note
Revision
Question
Formula
Mistake
```

---

# 82. PERSONAL AI MEMORY PAGE

Show what Tillu has learned about the student's study behavior.

Example:

```text
LEARNED ABOUT YOU

You tend to:
• perform better on recall after practice
• make more calculation errors late in sessions
• retain formulas better with spaced recall

Confidence:
Medium
```

Every learned preference should be editable/deletable.

---

# 83. TILLU MEMORY APPROVAL

For long-term memories:

```text
Tillu wants to remember:

"Heoster often prefers solving PYQs
before reading detailed explanations."

[Accept]
[Edit]
[Don't remember]
```

This prevents memory pollution.

---

# 84. STUDY HISTORY

Timeline:

```text
Today
09:12 Physics lecture
10:05 Physics PYQs
11:00 Chemistry recall
16:30 Maths quiz

Yesterday
...
```

Tap an event → detailed evidence.

---

# 85. SESSION REVIEW

After studying:

```text
SESSION COMPLETE

42 minutes

What changed?

✓ 2 concepts practiced
✓ 1 weakness improved
✓ 8 PYQs solved
✓ 2 mistakes recorded

Next review:
Tomorrow
```

---

# 86. TILLU INSIGHTS

A dedicated feed:

```text
TILLU INSIGHTS

💡 Your Physics accuracy improves
when you solve PYQs before rereading.

⚠ Integration is being forgotten faster
than your other Maths topics.

🎯 Your most valuable 30-minute block
today is Physics.
```

Each insight should cite the evidence behind it.

---

# 87. "WHY AM I WEAK?"

Student taps any weakness.

Tillu explains:

```text
You are weak in Sign Convention because:

7 attempts
3 correct
4 wrong

3 mistakes were the same type.

Your basic recall is improving,
but application is unstable.

Recommended:
3 easy examples
+
5 mixed PYQs
```

---

# 88. "PROVE THAT I KNOW IT"

A powerful button on every concept:

**PROVE MASTERY**

Tillu launches a mini assessment.

```text
Recall
+
Application
+
Hard question
+
Transfer question
```

At end:

```text
Mastery evidence:
STRONG / MODERATE / WEAK
```

---

# 89. "SURPRISE ME"

Tillu chooses:

```text
random recall
old mistake
forgotten formula
previous PYQ
mixed concept
```

The student doesn't know which subject will appear.

---

# 90. "TEACH ME BACK"

A premium learning mode.

Tillu says:

> "Explain this concept to me as if I'm a beginner."

Student explains.

Tillu evaluates:

* missing concepts
* incorrect reasoning
* terminology
* structure

This is useful for detecting false confidence.

---

# 91. "ONE LAST QUESTION"

After a lesson Tillu can ask:

> "Give me one question that proves you understood this."

This can be automatically generated.

---

# 92. "PAST ME VS CURRENT ME"

Show improvement:

```text
You vs 30 days ago

Recall        +18%
PYQ accuracy  +11%
Mistake rate  -23%
Mastery       +14%
```

---

# 93. STUDY STREAK REPLACEMENT

Instead of prioritizing streaks:

```text
KNOWLEDGE STABILITY

7-day recall stability
████████░░

Revision consistency
███████░░░

Mistake recovery
█████████░
```

Reward learning quality rather than app usage.

---

# 94. TILLU SCOREBOARD

Optional:

```text
TODAY'S WINS

✓ Repaired a weak concept
✓ Recalled 12 formulas
✓ Completed 8 PYQs
✓ Corrected 3 repeated mistakes
```

No manipulative gambling-style mechanics.

---

# 95. TEACHER/MENTOR MODE — FUTURE

Optional future page:

```text
Mentor View
```

Could summarize:

```text
Academic state
Weakness
Revision
Tests
Attendance
Recent improvements
```

Only with explicit sharing.

---

# 96. MOBILE APP FLOW

Bottom navigation:

```text
Home
Plan
Study
Revision
Progress
```

Floating button:

```text
🧠 Ask Tillu
```

Swipe from right:

**Tillu Context Sidebar**

---

# 97. PWA OFFLINE MODE

When offline:

```text
Available offline:
✓ Review
✓ Formula recall
✓ Cached quizzes
✓ Study history
✓ Local lecture tracking
✓ Basic planner
```

Queue events for sync.

---

# 98. RESPONSIVE LAYOUT

### Desktop

```text
Nav | Workspace | Tillu
```

### Tablet

```text
Workspace | Tillu
```

### Mobile

```text
Workspace

Tillu button
```

---

# 99. ACCESSIBILITY

Tillu must support:

* keyboard navigation
* screen readers
* readable contrast
* scalable text
* reduced motion
* captions/transcripts where available
* large touch targets
* non-color-only indicators

---

# 100. UI STATE SYSTEM

Every page should support:

```text
Loading
Empty
Success
Error
Offline
Degraded
Processing
```

Never show a blank screen.

Example:

```text
Research unavailable

Your study system is still working.
The research service will retry automatically.
```

---

# 101. EMPTY STATES

Empty state should teach the feature.

Example:

```text
No mistakes yet.

Complete your first quiz and Tillu
will begin building your mistake map.
```

---

# 102. TILLU PERSONALITY IN UI

Tillu should feel:

```text
Calm
Smart
Direct
Supportive
Evidence-based
Not childish
Not corporate
Not noisy
```

Avoid:

```text
🔥🔥🔥 YOU GOT THIS CHAMP!!!
```

Everywhere.

---

# 103. COLOR SYSTEM

Suggested semantic system:

```text
Green  = healthy / strong
Yellow = watch / moderate
Red    = urgent / weak
Blue   = informational
Purple = Tillu / intelligence
Gray   = inactive / historical
```

Do not rely on color alone.

---

# 104. MOTION

Use subtle animations for:

* state transitions
* progress
* completion
* agent activity
* plan changes

Avoid excessive animations during study.

---

# 105. TILLU CHAT AS GLOBAL CONTROL LAYER

The deepest design rule:

> **Anything important in Tillu should be operable from chat.**

Examples:

```text
"Start my next task."
"Move Physics to tomorrow."
"Why is this due?"
"Quiz me."
"Research this."
"Start the lecture."
"Show my mistakes."
"Build a 2-hour plan."
"Give me a 10-minute task."
"Don't notify me for the next hour."
```

The UI provides buttons.

Chat provides the natural-language control layer.

---

# 106. BROWSER SIDEBAR AS TILLU EXTENSION

When Chromium is active, the Tillu sidebar should know the current context.

```text
Tillu:
You are watching:
Physics / Ray Optics / Lecture 4

Options:
[Explain current topic]
[Summarize]
[Quiz me]
[Take notes]
[Add bookmark]
[Add revision]
[Ask about timestamp]
```

---

# 107. BROWSER → TILLU EVENTS

Examples:

```text
PAGE_OPENED
VIDEO_STARTED
VIDEO_PAUSED
VIDEO_RESUMED
VIDEO_PROGRESS
VIDEO_COMPLETED
TEXT_SELECTED
TAB_CHANGED
LECTURE_BOOKMARKED
```

These become events.

---

# 108. TILLU → BROWSER COMMANDS

Examples:

```text
OPEN_LECTURE
RESUME_LECTURE
PAUSE_LECTURE
OPEN_PLAYLIST
SEEK_TO_TIMESTAMP
OPEN_BOOKMARK
```

Every browser action passes through the local permission system.

---

# 109. LIVE LECTURE COMPANION

While a lecture plays:

```text
Lecture:
37:42 / 52:19

Tillu can:
• answer questions
• save timestamps
• collect important formulas
• create notes
• prepare a post-lecture quiz
```

The sidebar remains compact.

---

# 110. POST-LECTURE AUTOMATION

Automatically:

```text
Lecture ends
 ↓
Save progress
 ↓
Extract learning context
 ↓
Generate recall
 ↓
Update exposure
 ↓
Schedule revision
 ↓
Offer quiz
```

---

# 111. "ASK ABOUT THIS PAGE"

For any supported browser page:

```text
Ask Tillu about this page
```

Actions:

```text
Summarize
Explain
Quiz
Extract formulas
Extract key points
Save
Research deeper
```

---

# 112. "TURN THIS INTO STUDY"

On any webpage/video:

```text
TURN INTO STUDY MATERIAL
```

Tillu produces:

```text
Concepts
Notes
Questions
Revision cards
Formula list
Potential PYQs
```

Everything remains linked to the original source.

---

# 113. CROSS-PAGE CONTEXT

Tillu should remember the current learning context.

Example:

You read an article about electrochemistry.

Then open Tillu:

> "Want me to connect this to what you studied yesterday?"

This can surface:

```text
Yesterday:
Nernst equation

Current page:
Cell potential

Connection:
Strong
```

---

# 114. INTELLIGENT WORKSPACE

When the user is studying a concept, the workspace should dynamically offer relevant tools:

```text
Study
│
├── Notes
├── Formula
├── Questions
├── Tutor
├── Revision
└── Research
```

No need to leave the concept page.

---

# 115. NO-DEAD-END UI

Every important action should lead to the next useful action.

Example:

```text
Quiz complete
 ↓
Mistake found
 ↓
[Repair]

Revision complete
 ↓
[Prove mastery]

Lecture complete
 ↓
[Recall]

Research complete
 ↓
[Create quiz]
```

---

# 116. UNIVERSAL ACTION CARD

All major objects should have a common action pattern.

```text
Subject
Chapter
Concept
Question
Lecture
Research result
Mistake
Formula
```

Each can support:

```text
Open
Study
Ask Tillu
Revise
Test
Save
```

depending on relevance.

---

# 117. TILLU'S "NOW / NEXT / LATER"

On every major workspace:

```text
NOW
What matters immediately

NEXT
What comes after

LATER
What can wait
```

This reduces cognitive overload.

---

# 118. "DON'T KNOW WHAT TO DO"

One button:

**I DON'T KNOW WHAT TO STUDY**

Tillu calculates the Next Best Action.

No browsing through menus.

---

# 119. "I'M BEHIND"

One button:

**I'm behind**

Tillu enters Recovery Mode.

It asks for minimal information and rebuilds the plan.

---

# 120. "I HAVE AN EXAM"

One button:

**Exam coming**

Tillu prioritizes:

```text
syllabus gap
weakness
revision
PYQ
mocks
time management
```

---

# 121. PREMIUM-QUALITY FEEL

The premium feeling should come from:

```text
Context
Personalization
Automation
Evidence
Continuity
Speed
Low friction
```

not from filling the screen with cards.

---

# 122. THE MOST IMPORTANT SCREEN

Ultimately, Tillu should always bring the user back to:

```text
                    WHAT NOW?
                        │
                        ▼
               NEXT BEST ACTION
                        │
                        ▼
                   DO IT
                        │
                        ▼
                   MEASURE
                        │
                        ▼
                    LEARN
                        │
                        ▼
                   REPLAN
```

The rest of the application exists to make that decision smarter.

---

# 123. FINAL NAVIGATION MAP

```text
TILLU
│
├── 🏠 HOME
│   ├── Next Best Action
│   ├── Today
│   ├── Forgetting Radar
│   ├── Insights
│   └── System Health
│
├── 📅 PLAN
│   ├── Today
│   ├── Week
│   ├── Calendar
│   ├── Recovery
│   └── Availability
│
├── 📖 STUDY
│   ├── Subjects
│   ├── Chapters
│   ├── Concepts
│   ├── Tutor
│   ├── Questions
│   └── PYQs
│
├── 🧠 REVISION
│   ├── Due Now
│   ├── Forgetting Radar
│   ├── Recall
│   ├── Formula
│   ├── Reactions
│   └── Surprise Me
│
├── 📝 TESTS
│   ├── Daily Quiz
│   ├── Chapter Test
│   ├── Subject Test
│   ├── PYQ
│   ├── Mock
│   └── Exam Analysis
│
├── 🎥 LECTURES
│   ├── Continue
│   ├── Playlists
│   ├── Progress
│   ├── Bookmarks
│   └── Notes
│
├── 🔎 RESEARCH
│   ├── New Research
│   ├── Saved
│   ├── Sources
│   └── Knowledge
│
├── ❌ MISTAKES
│   ├── All
│   ├── Patterns
│   └── Repair
│
├── 📊 PROGRESS
│   ├── Board Readiness
│   ├── Mastery
│   ├── Study Analytics
│   ├── Learning Efficiency
│   └── Weekly Reports
│
├── 🧠 TILLU BRAIN
│   ├── Student State
│   ├── Memory
│   ├── Active Agents
│   └── Decisions
│
└── ⚙ SETTINGS
    ├── Profile
    ├── Subjects
    ├── Availability
    ├── Notifications
    ├── Browser
    ├── Privacy
    ├── Local Agent
    └── System
```

---

# 124. THE TILLU EXPERIENCE

The ideal experience is:

### Morning

```text
Open Tillu
 ↓
Morning Brief
 ↓
Next Best Action
```

### During study

```text
Focus Mode
 ↓
Questions / lecture / tutor
 ↓
Tillu quietly collects evidence
```

### Between sessions

```text
Revision due
 ↓
Tillu finds small opportunity
 ↓
5–15 minute recall
```

### When watching YouTube

```text
Chromium
 ↓
Tillu Sidebar
 ↓
Contextual tutor
 ↓
Bookmarks
 ↓
Notes
 ↓
Quiz
```

### When something goes wrong

```text
Missed plan
 ↓
Recovery
 ↓
No guilt
 ↓
New realistic plan
```

### At night

```text
Daily review
 ↓
Mastery update
 ↓
Revision update
 ↓
Tomorrow plan
```

### In the background

```text
Sentinel
 ↓
Agent health
 ↓
Failover
 ↓
Quota monitoring
 ↓
System recovery
```

---

# 125. FINAL UX PRINCIPLE

Tillu should never feel like:

> "Here are 50 features. Pick something."

It should feel like:

> **"I know where you are, I know what matters, and I have prepared the next useful thing."**

The UI should expose complexity only when the student needs it.

The backend can contain a sophisticated Hive of agents.

The visible Tillu should feel:

**calm + intelligent + personal + immediate.**

And the **Chromium sidebar should make the boundary between "Tillu" and "the student's study environment" almost disappear.**

That is what makes Tillu a genuine **Personal Study OS**, rather than another AI chatbot with a dashboard.

For Kiro, this document should become the **UI/UX authority alongside your PRD and TRD**. The critical implementation order is: **global shell 