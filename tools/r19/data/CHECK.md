# Checking the relationship labels on doctrine-timeline steps

You are checking labels on the steps of legal doctrine timelines. Read your pack file in full. Each timeline has an ANCHOR: the thing that "widens" and "limits" measure. Each step shows the OLD one-word turn, the NEW verb and the NEW short tag we propose, the step's NOTE (one sentence, already fact-checked against the brief), its FATE if any, and, for cases, the brief's rule line and holding.

The NEW verbs and their meanings:
- origin: the first step of the line (sets the starting rule, which later steps may reject).
- widens: after this step the ANCHOR reaches further (more cases in, more power, more recovery, easier survival, as the anchor is phrased).
- limits: after this step the ANCHOR reaches less far, or an exception or an outside doctrine (preemption, standing) cuts into it.
- extends: carries the doctrine into a new setting, field or kind of party without changing the test.
- sharpens: restates or clarifies the test more precisely; reach about the same.
- reaffirms: holds the existing rule when asked to change or loosen it.
- applies: a straightforward application; here as the standard illustration.
- overrules: expressly overrules an earlier step of the same line.
- displaces: replaces an earlier rule without the word "overrule": a statute or rule overrides a case, a higher court abrogates a lower court's doctrine, a formula is retired.
- codifies: a statute, rule or Restatement writes the existing case law down (if it changes the law, that is displaces).
- divided: no majority opinion.
- counterpoint: another court or legal system takes the other view.

For every step, decide: (1) Is the NEW verb right, measured against the ANCHOR and the earlier steps of the same timeline? (2) Is the NEW tag accurate to the brief and the note, with nothing overstated? (3) Does the brief contradict the note or tag? Flag only when you are confident something is wrong, and say what evidence makes you confident (quote the brief). Do not flag matters of taste. A different acceptable verb is not a flag unless the proposed one is wrong against the definitions above.

Write your flags as JSON to the output path you were given: a list of objects {"timeline": id, "step": n, "key": key, "problem": one sentence, "verb": proposed verb or null, "tag": proposed tag (6 words or fewer) or null, "evidence": quoted brief text or reasoning}. Write an empty list if nothing is wrong. Do not call any mcp__hearthbot__ tools. Do not edit any file in the repository. Reply with the number of flags and a one-line summary.
