"""Regression checks for preserving attribution when indexing an opinion."""
import json
from pathlib import Path
import runpy

HERE = Path(__file__).resolve().parent
index = runpy.run_path(str(HERE / 'compile.py'))['index_brief']

def passage(section, text):
    lines = text.split('\n')
    return '\n'.join('\n'.join(lines[a:b]) for a,b in section['spans'])

text = '''# Example v. Example
## Procedural History
The trial court dismissed the complaint.
## Material Facts
The parties signed an agreement before suit.
## Reasoning
The majority addressed the remedy.
### Questions about damages
The majority allowed recovery.
## Separate Opinions
Justice A dissented.
### The facts do not justify recovery
The dissent would deny recovery.
## Judgment
Reversed and remanded.
'''
sections = index(text, 'Example v. Example')
assert [s['title'] for s in sections] == ['Material Facts', 'Procedural History', 'Reasoning', 'Separate Opinions', 'Judgment']
assert '### Questions about damages' in passage(sections[2], text)
assert 'The majority allowed recovery.' in passage(sections[2], text)
assert '### The facts do not justify recovery' in passage(sections[3], text)
assert 'The dissent would deny recovery.' not in passage(sections[2], text)

# A multi-decision account must keep each court's holding and dissent together.
root = HERE.parents[1]
cohen = (root / 'tools/r19/data/briefs/CT-CB-0135.md').read_text()
sections = index(cohen, 'Cohen v. Cowles Media Co.')
stages = [s for s in sections if 'Supreme Court, 199' in s['title']]
assert len(stages) == 3
assert ['1990' in stages[0]['title'], '1991' in stages[1]['title'], '1992' in stages[2]['title']] == [True, True, True]
assert all('### Holding and actual judgment' in passage(s, cohen) for s in stages)
print('Cold Call attribution and multi-court chronology regression checks passed')
