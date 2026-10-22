# Relationship research and questionnaire assessment

Prepared October 21, 2026. Scope: research and assessment of the current repository; no questionnaire, scoring, or database behavior has been changed.

**Recommendation:** Rebuild the questionnaire around mutual requirements, practical compatibility, and concrete relationship behaviors. Treat personality and attachment as uncertain individual characteristics, not a formula for pairing similar people. Use subsequent interaction and relationship outcomes to test whether recommendations actually help both partners.

## 1. What the evidence can establish

This is a targeted evidence review, prioritizing meta-analyses, large dyadic studies, longitudinal designs, and studies measuring people while single. It is not an exhaustive systematic review. There is no defensible universal ranking of pre-relationship predictors: studies measure different outcomes, at different stages, with different populations and methods.

Three distinctions are essential:

- **Before meeting versus before marriage:** An engaged couple already has relationship-specific experiences. A premarital study is not automatically evidence for matching strangers.
- **Individual versus pair prediction:** A trait associated with a person's satisfaction does not establish which partner will uniquely suit that person.
- **Happiness versus persistence:** Staying together and being happy are separate outcomes. The product should seek relationships both people want to continue, rather than duration alone.

| Evidence | Finding | What is knowable before a new relationship? | Appropriate use |
| --- | --- | --- | --- |
| [Joel et al., 2020](https://pmc.ncbi.nlm.nih.gov/articles/PMC7431040/), 43 longitudinal datasets, 11,196 couples | Leading relationship-specific predictors were perceived partner commitment, appreciation, sexual satisfaction, perceived partner satisfaction, and conflict. Leading individual variables included life satisfaction, negative affect, depression, and attachment avoidance/anxiety. Individual variables explained less than relationship-specific reports; changes in quality were largely unpredictable. | General dispositions can be assessed, but actual commitment, appreciation, and sexual satisfaction with an unknown partner cannot. These were already-coupled participants. | Supports modest expectations for an intake questionnaire and later collection of relationship-specific feedback; does not validate matching strangers. |
| [Joel, Eastwick & Finkel, 2017](https://pubmed.ncbi.nlm.nih.gov/28853645/), two speed-dating studies | More than 100 pre-date traits/preferences did not predict the unique attraction between a particular pair, although general tendencies to desire or be desired were partly predictable. | Directly assessed before meeting. | Strong reason to test pair-specific claims rather than assume AI or a longer questionnaire solves chemistry. Attraction is not long-term success. |
| [Malouff et al., 2010](https://rune.une.edu.au/web/handle/1959.11/7370), 19 samples, 3,848 participants | Lower neuroticism and higher agreeableness, conscientiousness, and extraversion were associated with relationship satisfaction. | Individual personality is measurable before meeting. The associations themselves do not establish prospective matching accuracy. | Consider reliable measures of emotional stability, cooperation, and dependability. Do not interpret them as a validated partner-selection formula. |
| [Candel & Turliuc, 2019](https://www.sciencedirect.com/science/article/pii/S0191886919302673), 132 studies | Attachment anxiety and avoidance were associated with lower satisfaction. Associations with one's own satisfaction were stronger than associations with the partner's satisfaction, and findings varied with context. | General attachment orientations can be assessed; they are not fixed identities and may vary across relationships. | Optional dimensional measurement, subject to validation. No evidence here for mechanically pairing attachment types. |
| [Weidmann et al., 2023](https://pmc.ncbi.nlm.nih.gov/articles/PMC10312100/), 1,294 female–male couples | Similarity in personality traits and narrower facets was not robustly associated with relationship or life satisfaction. Individual and partner traits had associations. | Both people's traits are measurable. | Directly challenges blanket personality similarity scoring. It does not establish that opposites are better. |
| [Wells, Hoan & MacDonald, 2026](https://journals.sagepub.com/doi/10.1177/01461672261438616), six panel waves, 5,113 initially single people | Intimacy expectations during singlehood predicted higher later relationship satisfaction; negative expectations predicted lower satisfaction. The authors flag power limitations for satisfaction analyses and limited generalizability from young, predominantly heterosexual German participants. | This is unusually relevant evidence collected during singlehood. | An exploratory expectations module is justified; high matching weights and pair-specific claims are not. Replication and prospective product testing are needed. |
| [Falconier et al., 2015](https://pubmed.ncbi.nlm.nih.gov/26295276/), 72 samples, 17,856 participants | Dyadic coping and relationship satisfaction correlated at approximately r = .45. Collaborative/supportive coping mattered, but this concerns how existing partners cope together. | People can report past coping habits; an unknown pair's actual joint coping cannot be measured. | Ask about concrete support and stress behaviors, then verify through experience. The correlation is not questionnaire prediction accuracy or a model weight. |
| [Le et al., 2010](https://doi.org/10.1111/j.1475-6811.2010.01285.x), 137 studies, 37,761 participants | Commitment, love, interdependence-related variables, and social network support predicted dissolution; personality generally had limited predictive utility. | Many strongest predictors concern a relationship that already exists. Generic commitment intentions are only proxies. | Measure persistence separately from happiness; do not equate dependency or barriers to leaving with successful matching. |
| [Lavner, Karney & Bradbury, 2016](https://pmc.ncbi.nlm.nih.gov/articles/PMC4852543/), repeated observations of newlyweds | Communication and satisfaction were associated concurrently, but longitudinal effects in either direction were not consistently robust. | Self-described communication style is even further removed from observed behavior. | Improve behavior questions, but do not claim that an ideal communication style reliably causes enduring happiness. |

**Practical priority order for this product, not a published effect-size ranking:**

1. Establish mutually acceptable relationship goals and constraints.
2. Measure emotion regulation, reliability, consideration, attachment, and support patterns with appropriate uncertainty.
3. Check whether everyday expectations can coexist.
4. Use interests and sociability preferences to improve introductions and date suggestions.
5. Learn which matches work through mutually consenting follow-up data.

Children, relationship structure, location, and availability deserve priority because explicit incompatibilities can make a desired shared life infeasible. This is a product and logical compatibility argument, not evidence that these are universally the largest statistical predictors of satisfaction. Similarly, an association between a trait and dissatisfaction does not establish that excluding people with that trait improves matching.

Most evidence here is observational. Some measures overlap conceptually with satisfaction, and many samples overrepresent Western, heterosexual, already-established couples. Results cannot be transferred unchanged to every age, culture, orientation, or relationship structure. There is no scientifically established set of weights that turns this questionnaire into a probability of a happy lasting relationship.

## 2. Assessment of every existing question

The live question catalog is [lib/questionnaire/questions.ts](../lib/questionnaire/questions.ts). It has 30 questions across personality, life goals, values/beliefs, and lifestyle. The topic breadth and user-selected priorities are useful foundations. The main weaknesses are measurement quality, missing dimensions, and assuming agreement means compatibility.

| Current item | Recommendation | Reason and concrete replacement |
| --- | --- | --- |
| q1: Introversion–extroversion | Keep as optional context; reduce matching influence | Sociability alone is a narrow personality measure. Ask desired social schedule and tolerance for different schedules. |
| q2: Conflict avoidance–immediate confrontation | Replace | The endpoints mix timing with skill. Ask separately about escalation, taking a break, returning to the issue, and repair. Neither immediate confrontation nor avoidance deserves an automatic positive score. |
| q3: Communication style | Replace | Directness, tact, listening, and expressiveness can coexist. Ask about observable listening, checking understanding, and responding to feedback. |
| q4: Spontaneity | Optional context | Useful for planning dates. Ask how much advance notice someone needs and whether differences are acceptable. |
| q5: Desired partner traits | Remove from the core score | Selecting attractive words mostly captures ideals. Assess the person's own behavior and explicit needs; retain selected traits only as user-facing preferences if useful. |
| q6: Emotional expression | Rewrite | Expressiveness is different from regulation and responsiveness. Ask what happens when upset and how support is requested. |
| q7: Recharge style | Merge with q1/q30 | Distinguish personal habits from acceptable partner habits. “Doesn't matter” is flexibility, not a distinct type of person. |
| q8: Vulnerability comfort | Expand or replace with an attachment module | One item misses attachment anxiety, trust, dependence, and the difference between privacy and avoidance. |
| q9: Children | Split; highest product priority | Existing children and wanting future children are independent. Ask current parenting responsibilities, future plans, timing/flexibility, and openness to a partner with children. |
| q10: Career ambition | Rewrite | Ask actual work hours, travel, relocation, and time available for a relationship. Ambition does not tell the app whether schedules are compatible. |
| q11: Ideal location | Expand | Ask geography, distance tolerance, relocation willingness, and relevant timing. “No preference” must accept multiple answers. |
| q12: Stability versus passion | Replace | False tradeoff. Ask budgeting, financial risk tolerance, expected money arrangements, and willingness to discuss commitments. |
| q13: Ranked life milestones | Replace | Ranking forces potentially unwanted marriage/parenthood into a priority list and hides timing. Ask whether each milestone is wanted, unwanted, or undecided, then ask timing and flexibility. |
| q14: Relationship timeline | Keep and expand | Distinguish what someone seeks, whether they are available to pursue it now, and their preferred pace. Add relationship structure separately. |
| q15: Personal growth | Replace | Abstract self-improvement invites socially desirable answers. Ask about a recent change made after feedback. |
| q16: Political views | Keep with topic-specific acceptance | Broad labels omit which differences matter. Separate own views, acceptable differences, and dealbreakers. A privacy response supplies no evidence of alignment. |
| q17: Religion | Split | Two “actively religious” users need not share a faith or practice. Ask tradition if voluntarily disclosed, practices, child-raising expectations, and partner acceptance. |
| q18: Importance of shared beliefs | Replace with per-domain preferences | One importance answer cannot specify whether religion, politics, parenting, or household expectations matter. |
| q19: Social causes | Optional profile context | Useful for conversation; do not assume selecting the same causes predicts enduring happiness. |
| q20: Radical honesty versus kindness | Replace | Honesty and kindness are not opposites. Ask about disclosure of important information and handling difficult feedback respectfully. |
| q21: Gender roles | Replace with concrete expectations | Ask about paid work, domestic labor, caregiving, decision-making, and what arrangements are acceptable. Broad labels are ambiguous. |
| q22: Family/community involvement | Split | Family closeness, obligations, community connection, and boundaries differ. Ask frequency of involvement and expectations of a partner. |
| q23: Ethical choices | Remove from the core; replace with behavior | Almost anyone can endorse ethical behavior. Ask about taking responsibility and following through on commitments. |
| q24: Exercise | Optional lifestyle context | Ask whether shared participation is wanted or differences are acceptable. Avoid equating exercise frequency with relationship ability. |
| q25: Diet | Keep only where practically relevant | Ask requirements for a shared home/meals and acceptable differences. Dietary similarity is not automatically romantic compatibility. |
| q26: Pets | Split | Pet ownership, willingness to live with pets, and allergies differ. A flexible non-owner can be compatible with an owner. |
| q27: Physical intimacy | Rewrite; optional/private | Separate affection, sexual expectations, pace, boundaries, and comfort discussing changes. Include asexual and low/no-sex relationships without treating them as deficient. Preferences cannot establish future mutual sexual satisfaction. |
| q28: Leisure activities | Keep for introductions; low matching influence | Shared hobbies can help people meet and plan dates, but should not compensate for an explicit incompatibility. |
| q29: Alcohol | Split | Current consumption and partner acceptance are different fields. Add smoking/cannabis or other relevant habits through optional branches. |
| q30: Shared versus independent activities | Rewrite and combine with q1/q7 | Ask desired shared time, independent time, contact frequency, and acceptable ranges. Neither endpoint is universally better. |

## 3. Proposed questionnaire structure

Use a staged questionnaire rather than requiring every measurement before allowing introductions. The following is a starting design to pilot, not an empirically optimal question count. A card may contain several independently stored fields; usability testing must measure actual burden.

**Stage A: 14 practical compatibility cards.** For applicable domains, collect three distinct things: the person's situation/preference, acceptable partner situations, and whether that preference is flexible or required. Include explicit unknown/undecided, not-applicable, and prefer-not-to-answer states where appropriate.

| Card | Suggested prompt and structured fields |
| --- | --- |
| A1: Intent and availability | “What relationship are you seeking now?” Separate long-term partnership, marriage-oriented dating, casual dating, exploring, and self-description; independently ask current availability and preferred pace. |
| A2: Relationship structure | “What relationship agreements would work for you?” Monogamy, consensual nonmonogamy, exploring/undecided, self-description; distinguish current agreements from desired future agreements. |
| A3: Existing parenting/care | “What parenting or caregiving responsibilities are part of your life?” Separately ask openness to a partner with children and scheduling implications. |
| A4: Future parenting | “Would you like to raise children or additional children?” Yes/no/undecided/open under particular conditions; branch to timing and flexibility. Do not infer desire from fertility or existing children. |
| A5: Marriage/cohabitation | “Which future living and commitment arrangements would you want?” Store marriage and living together separately, with unwanted/undecided choices and timing where relevant. |
| A6: Geography | “Where can a relationship realistically happen?” Current region, distance tolerance, possible relocation, long-term location needs. |
| A7: Time and routine | “In a typical month, what time could you make for a relationship?” In-person availability, contact preferences, work travel, predictable schedule constraints. |
| A8: Faith and practice | “Which religious or spiritual practices would you want in a shared life?” Voluntary identity, home practices, child-raising expectations, acceptable differences. |
| A9: Important values | “Which specific differences would affect your willingness to build a life together?” Optional topics and boundaries; broad political identity alone is insufficient. |
| A10: Shared responsibilities | “How would you want paid work, household work, and caregiving decisions handled?” Use concrete arrangements and flexible scenarios rather than gender-role labels. |
| A11: Money expectations | “How would you want to handle saving, spending, financial risk, and major shared decisions?” Separate fields; optional discussion needs. Exact income is unnecessary for this first version. |
| A12: Substances | “Which habits are part of your life, and which would you be comfortable living with?” Store own alcohol/smoking/cannabis behavior separately from partner acceptance. |
| A13: Shared-home requirements | Optional branches for pets, allergies, diet, access needs, and family obligations. Ask the requirement itself rather than inferring it from a diagnosis or label. |
| A14: Affection and intimacy | Optional/private: “What affection, sexual relationship, pace, and boundaries would feel right to you?” Store dimensions separately, allow ranges and uncertainty, and ask whether differences are discussable. |

**Stage B: six behavior cards.** Use original behavior prompts as experimental items, not a validated scale. Ask about the last six months in close relationships, including friends or family where romantic experience is absent. Store the context: behavior with a friend is not interchangeable with behavior with a partner. Include no opportunity/not sure. Frequency anchors can be never/rarely/sometimes/often/almost always.

1. **Regulation:** “When a disagreement gets heated, how often do you pause before saying something hurtful?” Separately ask whether and when the person returns to a paused issue.
2. **Repair/accountability:** “When you realize you hurt someone, how often do you acknowledge your part and follow up?” Optional brief example.
3. **Listening/support:** “When someone close to you is upset, how often do you check what kind of support they want?” Ask support preferences separately; listening and problem-solving can both help depending on the recipient.
4. **Reliability:** “When you cannot keep a commitment, how often do you tell the person promptly and make a new plan?” Include an opportunity to describe constraints.
5. **Closeness/autonomy:** Ask separately about preferred shared time, independent time, reassurance, and how boundaries are negotiated. Do not compress these into one good-to-bad axis.
6. **Responding to feedback:** “Think of the last disagreement where someone asked you to change something. What did you do next?” Structured response plus optional short example; do not automatically reward a polished story.

Behavior items are less abstract than “How ethical are you?”, but remain vulnerable to self-presentation and imperfect recall. Scenarios and examples are useful hypotheses for improving measurement, not proven lie detectors. Test reliability and incremental predictive value before allowing these items to drive consequential ranking.

**Stage C: optional research-informed measurement.**

- **Attachment:** Consider the nine-item [ECR-RS](https://labs.psychology.illinois.edu/~rcfraley/measures/relstructures.htm) using the author's relationship-general instructions where appropriate for singles. Preserve scoring and response anchors. A friend-specific response should not be silently substituted for romantic attachment. Keep anxiety and avoidance as dimensions; do not label people with a fixed type or assume two similar scores are compatible.
- **Personality:** Pilot the 30-item [BFI-2-S](https://www.colby.edu/wp-content/uploads/2013/08/bfi2s-form.pdf). The [development paper](https://www.colby.edu/wp-content/uploads/2013/08/Soto_John_2017b.pdf) distinguishes it from the 15-item extra-short form; [further measurement research](https://www.colby.edu/wp-content/uploads/2020/12/Soto_John_2019.pdf) identifies substantial validity costs from very short measures. Do not cherry-pick a few items and call them validated facets. Verify applicable usage terms before deployment.
- **Expectations:** Pilot three original prompts about expected emotional support, anticipated loss of autonomy, and anticipated relationship stress. These are exploratory indicators inspired by the 2026 singlehood study, not a reproduction of its instrument or a validated three-item scale.
- **Well-being:** Consider optional life satisfaction/current stress questions only in a clearly explained research or support context. Do not infer psychiatric diagnoses, treat current distress as permanent, or deploy a blanket exclusion rule based on mental health.

Completion of all three stages would involve roughly 62 cards/items before branches: 20 core cards, nine attachment items, 30 personality items, and three expectations items. This is a pilot ceiling, not a requirement or an optimal length claim. Start with the core, make measurement modules resumable, and retain additional items only if they justify their burden. Optional interests can remain profile fields.

**How to phrase matching requirements:** Instead of asking only “How important is alcohol to you?”, ask “I drink occasionally; I am comfortable with a partner who does not drink or drinks occasionally; this is a preference/requirement.” Repeat the same separation for parenting, relationship structure, religion, location, and other relevant domains. Wanting a similar answer is only one possible preference.

## 4. Required changes to the matching model

The current implementation is a deterministic, requester-weighted similarity calculation, not a trained predictor of relationship success. See [algorithm.ts](../lib/matching/algorithm.ts), [scoring.ts](../lib/matching/scoring.ts), and [weights.ts](../lib/matching/weights.ts).

**Separate eligibility, preference fit, and learned outcome prediction.**

1. Apply mutually declared requirements in both directions, including reciprocal partner eligibility. An explicit nonnegotiable incompatibility cannot be offset by shared hobbies. Missing or private information is unknown: it is not an automatic pass, failure, or match. Ask for clarification privately or mark eligibility unresolved.
2. For eligible candidates, assess whether each person's stated acceptable conditions encompass the other's situation. Use domain-specific rules for flexibility and ranges. Two identical answers are neither necessary nor sufficient.
3. Keep practical fit, evidence coverage, and model uncertainty visible as separate concepts. Before calibration, describe “alignment on stated preferences,” rather than a probability of success.
4. Explore trait and behavioral contributions only with prospective validation. Keep individual effects distinct from pair interactions. A trait associated with satisfaction may help explain general outcomes while doing little to distinguish among a person's possible partners. Avoid making a global desirability score the core recommender.
5. Use an outcome-trained pair model only after enough relevant data exist. Literature correlations, feature-importance ranks, and user importance ratings are different quantities; none can be copied directly into scientifically justified model weights.

For an initial transparent ranking baseline, compute directional preference fit for A→B and B→A, show both internally, and compare simple aggregation rules in evaluation. A minimum or harmonic mean can discourage one-sided fits, but the choice is a product hypothesis, not a research finding. Required incompatibilities remain separate from these averages.

AI can assist with optional follow-up questions, user-confirmed extraction from short text, and explanations grounded in recorded answers. Preserve the source answer, extracted field, confidence, and user correction. Writing style, grammar, and verbosity must not become proxies for relationship ability. An LLM's explanation is not evidence that its compatibility inference is correct.

## 5. Code findings that affect this assessment

These are findings from static inspection plus a small in-memory execution of the current scoring functions. No production data or app behavior was changed.

| Finding | Evidence and implication | Recommended action |
| --- | --- | --- |
| Equal unhealthy responses receive maximum similarity | `scoreSimilarity("SCALE", "1", "1")` returns 1, including q2's “avoid it entirely” endpoint. | Specify whether an item measures acceptance, behavior, or context. Do not run every scale through distance-based similarity. |
| Flexible answers are treated as mismatches | q9 “Yes, definitely” versus “Open to it” receives the same zero as “Yes, definitely” versus “No.” | Ask actual acceptable outcomes and evaluate them explicitly; do not assume “open” always means acceptance. |
| Privacy responses can look perfectly aligned | Identical “Prefer not to say” values receive 1 for single-choice questions. | Store privacy and missingness separately from substantive answers. |
| Requirements can be averaged away | Importance weights are 0, 0.5, and 1. With 30 equally weighted questions, agreement on 29 yields about 96.7% even if the remaining disagreement is an explicit parenting incompatibility. | Add requirements outside the similarity average. |
| Scoring uses only requester's priorities | `computeCompatibility` receives requester priorities, not the target's. `Match.score` stores one number, including a score sourced from the second liker in the swipe flow. | Compute both directions and use a stable, documented pair representation. |
| Recalculation uses incompatible answer representations | Discover/compatibility paths pass stored JSON strings; `recompute-matches.ts` first parses them. `scoreMultiChoice` and `scoreRank` then try to parse again. Identical `["Humor", "Empathy"]` sets score 1 as stored JSON strings but 0 as decoded arrays. | Normalize typed values once at the boundary and make all callers/scorers use the same contract. |
| Incoming caches can remain stale | Questionnaire/priority updates delete caches where the user is requester; another user's cached evaluation of that user is not deleted. | Invalidate affected directions and include answer, preference, questionnaire, and scoring versions in cache identity. |
| Unknown coverage is hidden | Missing answers are excluded from the denominator; a tiny amount of agreement can appear as a high percentage. | Return domain coverage and uncertainty; avoid comparing sparse and complete profiles as if equally supported. |
| Candidate retrieval limits recommendation quality | Discover fetches up to 50 candidates before ranking, with one-way seeking and requester-side distance checks. | Enforce reciprocal eligibility and retrieve a sufficiently broad eligible pool before final ranking. Evaluate this separately from questionnaire quality. |
| No long-term outcome target is represented | The schema has swipes, matches, messages, and compatibility caches, but no structured relationship satisfaction/stability follow-ups. | Add consented outcome collection before claiming learned long-term success prediction. |
| Questionnaire semantics are not versioned | Questions exist in the TypeScript catalog and `prisma/seed.mjs`; stored answers reference question IDs. | Keep a single source of truth. Use new versions/IDs when meaning changes; never reinterpret an old q9 answer as the redesigned parenting fields. |
| Answer validity/completeness is not sufficiently enforced | Questionnaire POST stores arbitrary supplied values, and completion paths can advance onboarding without checking all required compatibility fields. | Validate question versions, value types, options, ranges, and required fields server-side; retain optional/private answers as genuinely optional. |

Related files: [questionnaire API](../app/api/questionnaire/route.ts), [completion API](../app/api/questionnaire/complete/route.ts), [priorities API](../app/api/priorities/route.ts), [discover API](../app/api/discover/route.ts), [swipe API](../app/api/swipe/route.ts), [recalculation](../lib/matching/recompute-matches.ts), [schema](../prisma/schema.prisma), [mobile questionnaire](../mobile/app/(onboarding)/questionnaire.tsx).

## 6. How to establish whether the changes work

**Define the outcome before training.** Evaluate mutually desired continuation alongside each partner's satisfaction and sense of respect/safety. Record relationship formation and later continuation separately; do not interpret an amicable breakup as automatically worse than an unhappy ongoing relationship. Avoid reducing divergent partners' reports to an average that hides one person's poor experience.

Proposed collection schedule, with explicit participation consent:

- After an actual meeting: whether it happened, each person's interest in another meeting, feeling understood/respected, and an optional reason if it did not continue.
- At one and three months after relationship formation: current status, both partners' satisfaction, responsiveness/appreciation, conflict and repair, and whether continuation is wanted.
- At six and twelve months: the same measures plus continuation or breakup timing. Repeated measurement distinguishes temporary satisfaction from sustained experience.

These are proposed product follow-ups, not evidence that these time intervals are optimal. Later answers belong to a later-stage model; never use post-meeting answers to claim pre-meeting prediction.

Compare the revised system with both the existing similarity baseline and a simpler mutual-requirements baseline. Start with interpretable statistical models, then test whether more complex models or text features provide held-out gains. Evaluate formation, satisfaction, and continuation separately as well as any predeclared combined target.

For observational modeling, split by person so no participant appears in both training and evaluation, account for repeated dyads, and include a later-time evaluation. Report uncertainty, calibration where probabilities are used, subgroup performance where sample sizes support it, and missing-outcome rates. Nonresponse is not failure, success, or being single. Product exposure determines which pairs can meet, and conditioning only on successful matches introduces selection bias.

Use a consented randomized comparison of recommendation policies, where feasible, to test whether changing the ranking improves outcomes. Hold required constraints fixed. Predefine measures and determine sample size from baseline rates and a meaningful improvement; do not assert that an arbitrary user count is sufficient.

Collect only the sensitive data justified by a clear purpose, with private visibility controls, deletion options, and explicit consent for model training or external AI processing. Do not reveal one partner's private questionnaire or follow-up answers in explanations to the other.

## 7. Recommended implementation order

1. **Measurement correctness:** Fix answer normalization, missing/private semantics, validation, cache invalidation, and questionnaire versioning. These are prerequisites for interpreting any experiment.
2. **Mutual compatibility:** Add intent, relationship structure, split parenting fields, acceptable-partner responses, and explicit requirements. Enforce reciprocal eligibility.
3. **Question quality:** Replace vague moral self-ratings and conflict-style labels with the behavior cards; move hobbies and general sociability out of the central success score.
4. **Optional measurement:** Pilot attachment and personality modules with proper scoring and realistic uncertainty. Test retention and burden as well as predictive value.
5. **Outcome learning:** Introduce opt-in follow-ups and evaluate the revised policy against simple baselines. Only then decide which extra items and AI components earn their place.

The research supports a more useful intake and a better learning process. It does not support marketing the resulting score as a scientifically validated probability that two strangers will have a happy, lasting relationship.
