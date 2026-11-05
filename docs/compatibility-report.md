# Telling us how your own file did

The most useful thing you can do for Tabularius is try it on a solution of your own and tell us what happened. `tabularius compatibility-report` makes that easy without sending anything: it reads one file on your computer, prints a short report, and stops. You read the report, and if you are happy with it, you paste it into an issue yourself.

## Make the report

<!-- docs-example: illustrative -->
```sh
tabularius compatibility-report Contacts.fmp12
```

It tries to read the file and to convert it, in a separate process, and it deletes the converted copy when it is done. A large file can take a few minutes; `--timeout SECONDS` sets how long to wait (300 by default), `--no-convert` only reads the file, `--json` prints the report as JSON, and `--out report.md` also saves it (it will not overwrite a file that is there).

A file with Encryption at Rest cannot be read without its passphrase and the command does not ask for one: the report says the file is encrypted and stops.

## What is in the report

- The versions of Tabularius, Node and your operating system, and the day (not the time).
- The file's size as a range ("10 to 100 MB"), and the FileMaker version that last saved it, as the file's header says.
- Whether the file read and converted, how long that took, the most memory it used, and, if it stopped, a fixed error class and the place in Tabularius's code where it stopped.
- How many tables, fields, layouts, scripts and so on there are. Numbers only.
- What Tabularius does not know yet, first: calculation functions, `Get ( )` options and script steps it cannot name, by id.
- What the file uses, with how often: script steps, calculation functions, `Get ( )` options, plug-in calls (the plug-in's four-character id and the function number), MBS function names, layout object kinds and triggers. An MBS function is named only if Tabularius has it built in; one it does not have appears as the group it belongs to ("text.(other)"), because the name is text you wrote in the formula and cannot be told from a name of your own.

## What is not in it

No file name or folder name. No table, field, layout, script, value list, account or custom function names. No record data, no formulas and no script text, not even with the names blanked out. No messages from inside the file. The command checks every name it lists against the shape of a FileMaker function, step or option name or an id, the list of script steps and of MBS functions Tabularius knows, and the product words FileMaker writes in a file's version string ("Pro", "Server" and so on), and counts anything else without showing it ("N uses of names that are not FileMaker's own were counted but not shown"). The command makes no network request and opens no browser.

Two things are worth a look before you paste. A plug-in's id is a short code its maker chose; if you wrote a plug-in only your company uses, its id is in the report. And the sizes and counts alone could tell someone who already knows your solution which one it is. If either matters to you, delete that line.

## Send it

Open a new issue with the **Compatibility report from my own file** form, and paste the report. Add a few words on what you expected and what happened. Reports with a failure are the most useful, and a clean one is welcome too: it tells us which kinds of solutions work. If you would rather not post publicly, say so in the issue and we will arrange another route; a security problem goes to the private route in [SECURITY.md](../SECURITY.md).

To count what a whole folder of files uses, for example a consultancy's, see `tabularius corpus-scan` in [Moving a solution](moving-a-solution.md#counting-what-a-collection-of-files-uses). To describe a file that will not open at all, see [Reporting a file that does not open](reporting-a-file-that-does-not-open.md).
