import random

syllables = [
  'bad', 'bak', 'bam', 'bat', 'ben', 'bin', 'bix', 'biz', 'bog',
  'bok', 'dak', 'dat', 'ded', 'den', 'dir', 'div', 'diz', 'dom',
  'dor', 'dot', 'jag', 'jak', 'jar', 'jaz', 'jem', 'jet', 'jig',
  'jin', 'jor', 'jot', 'kal', 'kan', 'kar', 'kat', 'kel', 'kik',
  'kin', 'kit', 'kor', 'kot', 'lar', 'law', 'lit', 'lok', 'lor',
  'lot', 'luk', 'lun', 'mad', 'man', 'mar', 'maz', 'mik', 'miz',
  'mor', 'mot', 'nar', 'naz', 'nix', 'nok', 'not', 'noz', 'pan',
  'par', 'pen', 'pik', 'pix', 'pod', 'pox', 'rad', 'rag', 'ran',
  'rat', 'rax', 'rel', 'rex', 'rin', 'rip', 'rok', 'rox', 'roz',
  'rod', 'ron', 'san', 'sez', 'sim', 'sun', 'sor', 'tan', 'taz',
  'tik', 'tok', 'tor', 'var', 'vat', 'vax', 'ver', 'vik', 'vim',
  'vit', 'viz', 'vor', 'war', 'wat', 'wax', 'wik', 'wil', 'win',
  'wiz', 'won', 'zam', 'zan', 'zap', 'zar', 'zen', 'zim', 'zip',
  'zix', 'zor', 'zot'
]

def make_word(num_syllables):
  chosen = []
  chosen_set = set()
  for i in range(num_syllables):
    while True:
      syllable = random.choice(syllables)
      if syllable in chosen_set:
        continue
      if len(chosen) > 0 and chosen[-1][0] == syllable[0]:
        continue
      chosen.append(syllable)
      chosen_set.add(syllable)
      break
  return ''.join(chosen)

words = [ make_word(3) for i in range(500) ]
print(' '.join(words))
