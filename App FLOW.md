
# Tillu — Complete App Flow

```text
                    ┌──────────────────────┐
                    │       HEOSTER        │
                    │     Opens Tillu      │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │   AUTH / LOCAL LINK  │
                    └──────────┬───────────┘
                               │
                               ▼
                 ┌────────────────────────────┐
                 │       TILLU HOME            │
                 │                             │
                 │ "What should I do now?"     │
                 └────────────┬───────────────┘
                              │
          ┌───────────────────┼────────────────────┐
          ▼                   ▼                    ▼
     START STUDY          REVIEW                  EXPLORE
          │                   │                    │
          ▼                   ▼                    ▼
       Study              Revision              Research
       Session             Manager               / Tutor
          │                   │                    │
          └───────────────────┼────────────────────┘
                              ▼
                         MEASURE RESULT
                              │
                              ▼
                       UPDATE STUDENT
                            STATE
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
           MASTERY         MISTAKES        MEMORY
              │               │               │
              └───────────────┼───────────────┘
                              ▼
                           REPLAN
                              │
                              ↺
```

---

# 1. First Launch Flow

When Heoster opens Tillu for the first time:

```text
WELCOME
   ↓
Create account
   ↓
Choose:
  Class 12
  CBSE
   ↓
Select subjects
   ↓
Enter exam/important dates
   ↓
Set normal availability
   ↓
Optional study preferences
   ↓
Import / build syllabus
   ↓
Connect optional local computer
   ↓
Tillu builds Student State
   ↓
Initial assessment
   ↓
First Study Plan
   ↓
HOME
```

### Important

Don't ask 30 questions during onboarding.

Tillu should start with minimum information and learn preferences from actual behavior.

---

# 2. Home Screen

The Home screen is the **command center**.

```text
┌─────────────────────────────────────────┐
│ TILLU                          🔔  ⚙️   │
├─────────────────────────────────────────┤
│                                         │
│ Good morning, Heoster                   │
│                                         │
│ 🟢 AVAILABLE                            │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │       YOUR NEXT BEST ACTION         │ │
│ │                                     │ │
│ │ Physics — Ray Optics                │ │
│ │ 8 PYQs • ~35 min                   │ │
│ │                                     │ │
│ │ Why?                                │ │
│ │ 🔴 Weak                             │ │
│ │ 🔴 Revision due                     │ │
│ │ 🟡 Recent mistakes                  │ │
│ │                                     │ │
│ │          [ START ]                  │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ TODAY                                   │
│ ███████████░░  68%                     │
│                                         │
│ 📚 Study       2h 15m                   │
│ 🧠 Revision    35m                      │
│ 📝 Tests       1                        │
│                                         │
│ 🔴 Forgetting Radar                     │
│ Integration • Ray Optics                │
│                                         │
├─────────────────────────────────────────┤
│ Home  Plan  Study  Revision  Profile    │
└─────────────────────────────────────────┘
```

The student shouldn't need to wonder:

> "What do I study?"

Tillu answers that.

---

# 3. Bottom Navigation

I recommend **5 primary tabs**:

```text
🏠 Home
📅 Plan
📖 Study
🧠 Revision
📊 Progress
```

Secondary features live inside these areas.

For example:

```text
Study
 ├── Lectures
 ├── Questions
 ├── PYQs
 ├── Tutor
 └── Research
```

---

# 4. Home → Start Study

Heoster taps:

**START**

Flow:

```text
NEXT BEST ACTION
       ↓
SESSION PREVIEW
       ↓
"Why am I doing this?"
       ↓
START
       ↓
FOCUS MODE
```

Example:

```text
Ray Optics
35 minutes

Goal:
Solve 8 PYQs

Reason:
Your mastery dropped to 51%.

We'll focus on:
• Lens formula
• Lens combinations
• Numerical problems

[ START SESSION ]
```

---

# 5. Focus Mode

During study:

```text
┌───────────────────────────────┐
│ Ray Optics                    │
│                               │
│        27:42                  │
│                               │
│ PYQ 4 / 8                     │
│                               │
│ [ Question ]                  │
│                               │
│                               │
│ [ Need Hint ] [ Tutor ]       │
│                               │
│ ✓ Mark complete               │
│                               │
│         [ PAUSE ]             │
└───────────────────────────────┘
```

Avoid excessive UI.

The objective is:

> **Get out of Tillu and study.**

---

# 6. During Study — Tillu Watches Evidence

Behind the scenes:

```text
SESSION_STARTED
       ↓
question attempted
       ↓
answer
       ↓
correct/incorrect
       ↓
error classification
       ↓
concept evidence
```

The student doesn't see the agent machinery.

---

# 7. If Student Gets a Question Wrong

Don't immediately say:

> Wrong ❌

Instead:

```text
Incorrect
   ↓
Identify likely error
   ↓
Ask:
"Was the issue formula, concept,
calculation or something else?"
```

Then:

```text
MISTAKE CREATED
       ↓
MISTAKE BANK
       ↓
CONCEPT MASTERY UPDATED
       ↓
REVISION PRIORITY UPDATED
```

---

# 8. Tutor Flow

From any question:

**Need Help → Tutor**

```text
Question
   ↓
Hint 1
   ↓
Student attempts
   ↓
Hint 2
   ↓
Student attempts
   ↓
Explanation
   ↓
Similar question
   ↓
Check understanding
```

This prevents Tillu from becoming an answer-copying machine.

---

# 9. Lecture Flow

From:

**Study → Lectures**

```text
Subjects
   ↓
Physics
   ↓
Chapter
   ↓
Ray Optics
   ↓
Approved Playlist
   ↓
Lecture 04
   ↓
OPEN LOCAL PLAYER
```

Then:

```text
Tillu Local Agent
       ↓
Controlled Chromium
       ↓
YouTube
       ↓
Lecture
```

Progress is continuously recorded.

---

# 10. Lecture Completion Flow

When lecture ends:

```text
LECTURE COMPLETED
        ↓
"What did you learn?"
        ↓
3–5 recall questions
        ↓
Quick assessment
        ↓
Concept evidence
        ↓
Revision scheduled
```

This is **very important**.

Otherwise:

```text
10 lectures watched
=
10 lectures watched
```

instead of:

```text
10 lectures watched
+
retrieval evidence
=
actual learning evidence
```

---

# 11. Revision Tab

Revision should be one of Tillu's most important screens.

```text
┌─────────────────────────────────┐
│ REVISION                        │
├─────────────────────────────────┤
│                                 │
│ 🔴 DUE NOW                      │
│                                 │
│ Integration                     │
│ Ray Optics                      │
│ Electrochemistry                │
│                                 │
│ 🟡 COMING UP                    │
│ Matrices                        │
│ Probability                     │
│                                 │
│ 🧠 MEMORY HEALTH                │
│                                 │
│ Strong       ████████░░  82%    │
│ Stable       ██████░░░░  61%    │
│ Weak         ████░░░░░░  39%    │
│                                 │
│ [ START REVISION ]              │
└─────────────────────────────────┘
```

---

# 12. Revision Session

Tillu doesn't simply show notes.

It asks:

```text
RECALL
 ↓
CHECK
 ↓
FEEDBACK
 ↓
RECALL AGAIN
```

Example:

> Without looking, write the lens formula.

Student answers.

Then:

```text
✓ Correct

Next:
Explain what each variable represents.
```

---

# 13. Revision Intelligence

Every revision session updates:

```text
Recall
   ↓
Memory strength
   ↓
Forgetting risk
   ↓
Next review
```

So Tillu learns:

> "Heoster knows this."

or:

> "Heoster studied this but can't reliably retrieve it."

That distinction is central to the product.

---

# 14. Daily Quiz Flow

Every day:

```text
Tillu wakes
    ↓
Student State
    ↓
Select:
 • weak concepts
 • due revision
 • recent mistakes
 • important concepts
    ↓
Quiz Generator
    ↓
Quiz
```

Home:

> 📝 **Your 10-question daily quiz is ready.**

---

# 15. Quiz Screen

```text
Question 3 / 10

A particle moves...

[ Answer ]

○ A
○ B
○ C
○ D

[ Submit ]
```

After submission, don't necessarily reveal the answer immediately.

Depending on mode:

```text
Recall mode
→ answer later

Learning mode
→ immediate feedback

Exam mode
→ feedback at end
```

---

# 16. Quiz Completion

```text
10 questions
8 correct

Score: 80%

But Tillu also detected:

🔴 2 conceptual mistakes
🟡 1 calculation mistake

Mastery updated.

3 concepts require follow-up.
```

Then:

**[ VIEW MY REPAIR PLAN ]**

---

# 17. Mistake Bank

```text
PROGRESS
 ↓
Mistake Bank
```

Screen:

```text
MISTAKE BANK

🔴 Integration
   4 mistakes

   Common issue:
   Choosing wrong integration method

🔴 Ray Optics
   3 mistakes

   Common issue:
   Sign convention

🟡 Electrochemistry
   2 mistakes
```

Tap a mistake:

```text
What happened?
Why?
Correct method
Similar question
Retry
```

---

# 18. Repair Session

When a pattern is detected:

```text
Mistake Pattern
      ↓
Micro Explanation
      ↓
Easy Question
      ↓
Medium Question
      ↓
PYQ
      ↓
Delayed Recall
```

Only after successful repair should Tillu reduce the weakness.

---

# 19. Plan Screen

The Plan shouldn't be a rigid timetable.

It should show:

```text
TODAY

08:00  School           FIXED
16:30  Physics PYQs     HIGH
17:15  Break
17:30  Chemistry Rev    HIGH
18:00  Maths Quiz       NORMAL
20:00  Formula Recall   OPTIONAL
```

---

# 20. Dynamic Plan

Suppose Heoster misses:

**4:30 Physics PYQs**

Tillu doesn't show:

> ❌ YOU FAILED YOUR PLAN

Instead:

```text
4:45 PM

Plan changed.

You have 2h 15m remaining.

Tillu moved:

Physics PYQs → 5:00
Formula recall → tomorrow
Low-priority revision → removed

Your important work still fits.
```

---

# 21. Presence-Based Flow

Tillu continuously maintains:

```text
Student State
+
Time
+
Presence
```

Example:

```text
Student active
      ↓
AVAILABLE
      ↓
Next Best Action
```

If inactive:

```text
No interaction
      ↓
AWAY
      ↓
Don't spam notifications
```

If local agent reports a study session:

```text
Local activity
      ↓
STUDYING
      ↓
Pause irrelevant notifications
```

---

# 22. Opportunistic Study

Suppose Tillu detects an appropriate **10-minute opportunity**.

Instead of:

> "You have tasks pending."

It says:

> **You have 10 minutes. Want to clear 5 overdue formula recalls?**

One tap.

```text
10-minute opportunity
       ↓
Candidate tasks
       ↓
Priority ranking
       ↓
Best micro-task
```

---

# 23. Research Flow

From:

**Study → Research**

```text
Ask Tillu
    ↓
"What exactly do you need?"
    ↓
Query decomposition
    ↓
Parallel search
    ↓
Source validation
    ↓
Synthesis
    ↓
Answer
```

Example:

> "Explain why the electric field inside a conductor is zero."

Tillu produces:

```text
Simple explanation
        ↓
Board-level explanation
        ↓
Diagram
        ↓
Important wording
        ↓
Possible exam question
        ↓
1-minute recall test
```

So research feeds directly into learning.

---

# 24. Research → Knowledge Flow

This is important.

Research shouldn't just disappear into chat history.

```text
Research
   ↓
Useful claim
   ↓
Academic concept
   ↓
Knowledge Base
   ↓
Quiz / Revision / Notes
```

---

# 25. Formula Manager

Separate screen:

```text
FORMULA VAULT

Physics
 ├─ Mechanics
 ├─ Electrostatics
 ├─ Current Electricity
 └─ Optics

Chemistry
 ├─ Physical
 ├─ Organic
 └─ Inorganic

Maths
 ├─ Calculus
 ├─ Algebra
 └─ Probability
```

But the important button is:

**RECALL**

not just **VIEW**.

---

# 26. Board Preparation Flow

Tillu maintains:

```text
SYLLABUS
   ↓
COVERAGE
   ↓
MASTERY
   ↓
REVISION
   ↓
PYQ
   ↓
MOCK
   ↓
EXAM READINESS
```

Dashboard:

```text
BOARD READINESS

Syllabus       92%
Mastery        71%
Recall         68%
PYQs           76%
Mocks          61%
Weakness       43%

Estimated readiness:
🟡 Improving
```

This should never be presented as a guaranteed exam score.

---

# 27. Exam Mode

When Heoster starts a mock:

```text
EXAM MODE
 ↓
Lock distractions
 ↓
Timer
 ↓
Questions
 ↓
Submit
 ↓
Evaluation
 ↓
Analysis
```

After exam:

```text
Score
+
Time analysis
+
Mistakes
+
Weak concepts
+
Presentation problems
+
Next revision
```

---

# 28. Progress Screen

Instead of only:

> "You studied 43 hours."

show:

```text
LEARNING PROGRESS

Coverage       92%
Mastery        71%
Recall         68%
PYQ accuracy   76%
Mock accuracy  64%

Most improved:
✓ Matrices
✓ Probability

Needs attention:
🔴 Integration
🔴 Ray Optics
```

---

# 29. Weekly Review

Once a week:

```text
WEEKLY INTELLIGENCE REPORT

You studied: 21h 40m

But more importantly:

Mastery:
+7%

Recall:
+5%

Repeated mistakes:
-18%

Strongest:
Chemistry

Weakest:
Physics Optics

Tillu recommendation:
Increase Physics problem-solving
by ~40 min/day next week.
```

---

# 30. The Tillu Brain Screen

You can have an advanced screen called:

**🧠 Tillu Brain**

Not because the system literally has consciousness, but as a visualization of its current internal state.

```text
TILLU BRAIN

Student
   │
   ├── Current State
   │
   ├── Goals
   │
   ├── Knowledge
   │
   ├── Weakness
   │
   ├── Memory
   │
   ├── Schedule
   │
   └── Preferences

Active Agents
   │
   ├── Planner       🟢
   ├── Revision      🟢
   ├── Quiz          🟢
   ├── Research      🟢
   ├── Tutor         🟢
   └── Sentinel      🟢
```

This makes the Hive Mind understandable rather than mysterious.

---

# 31. Agent Activity

Don't expose technical logs to the student by default.

Instead:

> **Tillu is thinking...**

Optional expanded view:

```text
Planning
 ✓ Checked revision
 ✓ Checked deadlines
 ✓ Checked recent mistakes
 ✓ Calculated available time
 ✓ Generated plan
```

This gives the feeling of intelligence without overwhelming the user.

---

# 32. Sentinel User Flow

If something breaks:

```text
Agent failure
     ↓
Sentinel detects
     ↓
Retry
     ↓
Fallback
     ↓
Recovery
```

If recovered:

> 🟢 **Tillu repaired a background service automatically.**

If not:

> 🟡 **Research is temporarily unavailable. Your study plan and revision system are still working.**

This is much better than:

> Error 503.

---

# 33. System Status Screen

Advanced users can open:

**System → Tillu Health**

```text
CORE             🟢
DATABASE         🟢
PLANNER          🟢
REVISION         🟢
QUIZ             🟢
RESEARCH         🟡
MODEL ROUTER     🟢
AUTOMATION       🟢
LOCAL AGENT      🟢

Last full diagnostic:
23:30

Self-healing:
2 incidents recovered
```

---

# 34. Notification Flow

Tillu should have an internal notification intelligence layer.

```text
EVENT
 ↓
Is this important?
 ↓
Is student available?
 ↓
Is notification allowed?
 ↓
Was similar notification already sent?
 ↓
Send / queue / suppress
```

Example:

```text
Revision due
+
student sleeping
=
wait
```

Example:

```text
Exam tomorrow
+
critical task missing
+
student active
=
notify
```

---

# 35. Morning Flow

```text
Wake window
     ↓
Tillu prepares daily state
     ↓
Revision due
     ↓
Deadlines
     ↓
Yesterday's mistakes
     ↓
Available time
     ↓
Generate plan
     ↓
Morning briefing
```

Briefing:

> **Good morning.**
>
> Today your highest priority is Physics.
>
> You have 3 revision items at risk and one pending chapter test.
>
> Your first recommended session is 35 minutes of Ray Optics PYQs.

---

# 36. Night Flow

```text
End of day
     ↓
Study data
     ↓
Quiz results
     ↓
Mistakes
     ↓
Revision performance
     ↓
Plan completion
     ↓
Mastery update
     ↓
Tomorrow prediction
```

Night report:

```text
TODAY

Study       3h 12m
Revision    42m
Quiz        8/10
PYQs        14
Mistakes    3

Best improvement:
Matrices

Needs tomorrow:
Ray Optics

Tomorrow's priority:
Physics
```

---

# 37. Complete Daily Loop

This is the **heart of the app**:

```text
                 MORNING
                    │
                    ▼
              DAILY BRIEFING
                    │
                    ▼
             NEXT BEST ACTION
                    │
                    ▼
                STUDY
                    │
                    ▼
                PRACTICE
                    │
                    ▼
                 TEST
                    │
                    ▼
              COLLECT EVIDENCE
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
     MASTERY     MISTAKES     MEMORY
        │           │           │
        └───────────┼───────────┘
                    ▼
                REVISION
                    │
                    ▼
                 REPLAN
                    │
                    ▼
               NIGHT REVIEW
                    │
                    ▼
             TOMORROW STATE
                    │
                    └──────────↺
```

---

# 38. What Happens When Heoster Does Nothing?

This is where your **24×7 idea** becomes useful.

Tillu doesn't need to constantly interrupt him.

Instead:

```text
Heoster offline
      ↓
Tillu continues background work
      ↓
Update revision predictions
      ↓
Analyze completed work
      ↓
Prepare quizzes
      ↓
Research requested topics
      ↓
Run health checks
      ↓
Prepare next plan
```

When he returns:

```text
WELCOME BACK

While you were away:

✓ Tomorrow's plan prepared
✓ 3 revision items identified
✓ Daily quiz generated
✓ System healthy

NEXT:
Physics — Ray Optics
35 minutes
```

---

# 39. But Don't Make Tillu "Always Doing Something"

This is an important correction to the original vision.

**24×7 autonomous ≠ 24×7 AI calls.**

Otherwise your free APIs will burn through their limits.

Instead:

```text
             TILLU 24×7
                  │
        ┌─────────┴─────────┐
        │                   │
     EVENT DRIVEN       SCHEDULED
        │                   │
        ▼                   ▼
    User action         Daily jobs
    Quiz result         Health checks
    Lecture end         Revision scan
    Test result         Planning
```

When nothing needs to happen:

> **Tillu sleeps.**

The system remains available, but it doesn't waste compute.

---

# 40. The Most Important Flow

If I had to reduce the entire application to **one screen + one loop**, it would be:

```text
┌────────────────────────────────────────┐
│                 TILLU                  │
│                                        │
│             🧠 YOUR NEXT MOVE          │
│                                        │
│       Physics — Ray Optics             │
│       8 PYQs • 35 minutes              │
│                                        │
│       Why?                             │
│       🔴 Weak concept                  │
│       🔴 Revision due                 │
│       🟡 3 recent mistakes            │
│                                        │
│             [ START ]                  │
│                                        │
├────────────────────────────────────────┤
│                                        │
│ TODAY                                  │
│                                        │
│ Study       2h 15m                     │
│ Revision      35m                      │
│ Quiz         8/10                      │
│                                        │
│ 🔴 Forgetting                          │
│ Integration • Ray Optics               │
│                                        │
│ 🟢 Tillu Systems Healthy               │
│                                        │
├────────────────────────────────────────┤
│ Home │ Plan │ Study │ Revision │ More │
└────────────────────────────────────────┘
```

Everything else exists to make that **Next Best Action** increasingly intelligent.

That is the app flow I'd use as the foundation for Tillu.
