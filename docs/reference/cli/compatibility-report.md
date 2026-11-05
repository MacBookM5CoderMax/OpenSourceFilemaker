# tabularius compatibility-report

This command's usage comes from `tabularius help compatibility-report`. Statements comparing behavior with FileMaker in this program help are inferred from the implementation.

## Usage

```text
Usage:
  tabularius compatibility-report <file.fmp12> [--out FILE] [--json] [--no-convert] [--timeout SECONDS]
                                             Try one file and write a short report you can share:
                                             whether it read and converted, and how many of each
                                             function, script step, plug-in call and layout
                                             object it uses, with the ones Tabularius does not
                                             know yet listed first. Counts and FileMaker's own
                                             names only: no file name, table, field, layout or
                                             script names, no records or formulas. It prints the
                                             report (--out also saves it; refuses to overwrite)
                                             and sends nothing: you read it, then paste it into an
                                             issue yourself
```

## Options

`--json`, `--no-convert`, `--out`, `--timeout`

## Exit codes

0 on success; 1 on error.

## Tested CLI example

```sh
tabularius compatibility-report --help
```

This example is executed by the CLI reference test.

[All commands](index.md)
