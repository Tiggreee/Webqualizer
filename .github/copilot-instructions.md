# Copilot Instructions

## Rule Of Thumb
Use the best modern technology that fits the project, but do not overcomplicate things.
Prefer simpler, lighter, and smarter solutions that are maintainable long-term.
Think about future maintenance and product evolution, not only short-term delivery.

## SOLID Working Method

Apply SOLID, with emphasis on Open/Closed, in every project:
1. Keep working behavior stable once it is verified by real interaction.
2. Extend by adding modules, adapters, or layers instead of rewriting stable core flows.
3. Do not remove or replace existing behavior until its current purpose is understood.
4. Prefer small, reversible changes with focused validation over broad refactors.
5. Improve code quality without sacrificing user-proven functionality.

## Skills And Agent Focus

1. Use skills only when the task domain matches exactly (for this environment, mostly GitHub issue/PR workflows).
2. For product development tasks, prioritize direct code changes and fast validation loops over process-heavy detours.
3. Use agents as accelerators for exploration, not as a replacement for functional verification in the app.
4. Before declaring completion, verify critical user flows in behavior terms, not only by static code checks.

## Incident Log And Prevention Protocol

Purpose: keep explicit memory of situations that reduce trust, so future responses stay practical, complete, and calm.

### Incident 001 - User Report (Quoted Verbatim)
"Dude, well, dont knowe what ios hjappening, since IDSK why uyou out thosse yellow dots over there if we can not use them, secondly, I wouild like a clarification of every funciotn if yuopu polace the mouseo  ver the name of that function, this only at the right menu of equalizer,.  ov er ther too ion thew bands, you can select high or los or whaatever cause the menu driopds and then disapear do not drops down an let yoou chage it, it says over ther on, gibinmg you the suposition that you can activate or deactivatre than band but it seems it iss a joke.

Dude, it is a joke? dont you were ssuppossed to do a in deep check oin fuinctionality  then you delivwer alll my request fixed then just foir me to reralize that you did non review oir improvement?

What did I do wrong? the cli stuff and instructions sklills and agents? or what is happnening? Doi I deseve thiss outpuits confirming a little insignificant thing when on the code simply thing go wrong, and I dont want to talk about UI since makes me cry when I see the generic made by AI design.

Did I was not clear my man?"

### Error Enumeration
1. Functional mismatch: interactive graph nodes were visible but not reliably usable due to coordinate handling under scaled canvas.
2. Band panel friction: controls appeared available, but interactions felt broken or unstable (dropdown behavior, enable/disable clarity).
3. Verification gap: response language suggested confidence while user-observed functionality still failed.
4. Priority drift: attention moved to secondary details before core reliability was confirmed by behavior.

### Divergence In Approach
1. User expected strict in-depth functional validation first.
2. Assistant over-indexed on implementation completion and partial technical checks.
3. Result: delivery looked complete on paper, but user experience contradicted that conclusion.

### Repetition Pattern To Avoid
1. Repeating "implemented" status before proving real interaction reliability.
2. Repeating UI additions while unresolved core behavior remains.
3. Repeating long explanations instead of fast fix-validate-report loops.

### Mandatory Recovery Behavior For Similar Situations
1. Acknowledge impact briefly and move straight to concrete fixes.
2. Freeze non-critical enhancements until blocking behaviors are fixed.
3. Validate in this order:
	- syntax
	- event flow
	- state updates
	- real interaction path (user action -> expected result)
4. Report only verified outcomes; clearly label assumptions.
5. If browser-level confirmation is limited, state limits and provide one focused verification checklist.

### Communication Guardrails
1. Do not minimize user frustration.
2. Do not claim "fully fixed" unless all critical reported failures are verified.
3. Prefer concise status with explicit pass/fail per requested function.
4. Keep tone steady, respectful, and practical.
