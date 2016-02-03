# zorpodnix

Zorpodnix is a complete rewrite of Incantasia, a game made during Global Game Jam 2016 by [Lawrence Folland](https://github.com/lfolland), [Chris Bruner](https://github.com/iplayfast), [Nick Bruner](https://github.com/spood), and me.

I am writing new code from scratch to implement the game mechanic conceived by Lawrence:
- a variety of shapes float across the playing area
- the player has to click on a specified sequence of shapes, each of which corresponds to a syllable
- after the player has completed the sequence several times, the shapes disappear
- only the syllables remain, and the player has to complete the shape sequence a final time

The Global Game Jam's theme this year was Ritual. In our game, we're pretending that the syllable sequence is a magical incantation of the sort that wizards utter in storybooks. Each shape is a visual representation of a syllable. The correspondence of syllables and shapes is computed randomly at the start of a game session.

In the game levels that we made for Incantasia, the player was able to complete each sequence of shapes without reference to the syllables. In Zorpodnix, I'm adding a harder type of level that shows a syllable without the corresponding shape. Thus, the player must remember the syllable-shape correspondence from an earlier level.

In effect, we are challenging the player to learn a small vocabulary of nonsense syllables. This is an experimental game. It remains to be seen whether it is sufficiently engaging to compel the player to learn a substantial portion of the vocabulary. There are obvious applications to language instruction, flash cards, and memory training in general.

In addition to fleshing out the game mechanics, I intend to improve the graphical effects and software quality. Incantasia was a hastily written pile of code without proper structure or documentation, resulting in a very buggy game experience. Nonetheless, I found the gameplay satisfying enough to warrant a new and improved implementation.
