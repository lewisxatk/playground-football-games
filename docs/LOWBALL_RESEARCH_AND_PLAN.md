# Lowball — reference research and implementation plan

## Reference checked

Reference: https://lowball.clubpark.app/

The public page could not be fetched directly in this research session, so this note uses the current ClubPark App Store listing and public developer/community posts rather than claiming to have reverse-engineered its private implementation.

What is publicly described:
- ClubPark Lowball is a daily football game with seven questions.
- Players aim for the lowest score; the public description says “Name the answers nobody else does.”
- The launch post describes trying to beat a panel of 100 football fans.
- ClubPark says the website and app share leaderboards.
- Public discussion shows that the exact wording and eligibility rules matter: examples include a hat-trick question with a “team did not win” condition and reports of valid players/records not being recognised.

Sources:
- ClubPark App Store listing / version notes: https://apps.apple.com/gb/app/clubpark-away-day-companion/id6809030038
- Launch post describing seven questions and a panel of 100: https://www.xitter.cf/AwayDaysFB/status/2123884391873052922
- Public discussion and examples of answer validation: https://www.xitter.cf/AwayDaysFB

## Current Playground gap

The existing Playground game called “Who's Got More?” is not the same mechanic. It is a ten-round higher/lower comparison using recorded senior international goals. It does not ask seven English-football questions, accept a range of valid answers, or score answers by how uncommon they are among a fan panel.

## Recommended Playground version

Build a distinct seven-question daily game, English football first:
1. Questions should focus on Premier League and EFL history, with occasional FA Cup, League Cup, Champions League and World Cup questions.
2. Each question must have an explicit date/season/competition scope and a verified answer set.
3. Accept all valid aliases and spelling variants; show a clear correction/appeal route when a valid answer is rejected.
4. Score each answer by its measured frequency among Playground respondents. Lower-frequency valid answers score fewer points; lowest total wins.
5. Do not invent “100 fans said” percentages. Until a sufficiently large response sample exists, label scores as provisional estimates or run a private calibration round. Once 100 distinct responses are collected, show the real sample size and distribution.
6. Keep seven questions per daily challenge, with practice mode separate from the shared daily leaderboard.
7. Store source provenance and validation notes for every accepted answer, especially qualifiers such as “in the Premier League”, “while at an English club”, or “in a match his team did not win”.

## Build acceptance checks

- [ ] Seven daily questions exactly.
- [ ] English domestic content is the default.
- [ ] At least one valid answer per question, with a curated alias list.
- [ ] No question can be ambiguous about era, competition, or statistical condition.
- [ ] Rarity scores come from actual anonymised Playground answers, not fabricated crowd data.
- [ ] Leaderboard sorts by lowest total score.
- [ ] Answer challenges can be reviewed and corrected without silently rejecting a legitimate answer.


## Additional research — comparable rarity quiz (27 November 2026)

A separate public game, Longshots, now documents a closely related answer-rarity format. It is **not ClubPark Lowball**, so use it as a design reference rather than assuming the products share rules.

What Longshots publicly documents:
- Seven free-text questions per daily round, with 25 seconds per question.
- Any factually correct answer can be accepted; there are no multiple-choice options.
- Correct answers are assigned one of five rarity bands (6, 18, 40, 55 or 100 yards) based on how many people playing that day supplied the answer.
- Its answer sheet shows accepted answers and the share of players who gave them.
- Its published answer guidance describes alias and spelling normalization, while warning that answer lists can still miss valid responses.

How this informs Playground:
- Keep the seven-question, free-text, verified-answer-set approach.
- Build answer aliases and a visible challenge/correction process before launch; incomplete answer lists are a known source of player frustration.
- Use actual Playground responses for Lowball's rarity distribution. Do not copy Longshots' distance bands or reverse its scoring direction: ClubPark's public description says the lowest total wins.
- Do not add a 25-second timer to ClubPark-style Lowball unless we independently confirm that is part of the reference rules.
- The ClubPark App Store version notes also say its website and app share leaderboards and that players can connect an account for the verified table or compare with friends. This is a useful product requirement, but Playground needs its own privacy-conscious leaderboard design.

Sources checked:
- ClubPark App Store version notes (Lowball: seven daily questions, lowest score wins, shared website/app leaderboards): https://apps.apple.com/ng/app/clubpark-your-football-hub/id6809030038
- Longshots official rules: https://longshots.games/how-to-play
- Longshots official scoring explanation: https://longshots.pro/scoring/
- Longshots official research and answer-quality notes: https://longshots.games/about
- Longshots launch discussion: https://www.reddit.com/r/browser_gaming/comments/1xn0z42/longshots_a_daily_football_quiz_where_obscure/

Limitations:
- Public ClubPark material confirms the seven-question / lowest-total format and the 100-fan panel concept, but does not publish the exact score bands, panel sampling process, answer normalization algorithm or appeal workflow. Those details must remain marked unknown until independently verified.
