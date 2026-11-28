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
