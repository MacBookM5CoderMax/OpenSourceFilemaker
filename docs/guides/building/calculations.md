# Add a calculation

Use this guide when a value should be derived from fields rather than typed by a person. It covers a stored calculation field in a new table and how to check its result.

1. Identify the input fields and write the result as a calculation before adding it to the design.
2. Create a field with calculation kind and choose its result type. In the web editor, use the formula checker to catch unknown fields and invalid formulas.
3. Save the design, create or edit a record with known inputs, and compare the displayed result with a hand calculation.
4. Check the account's field privileges if the formula reads data users may not see; calculations can have their own privilege implications.

## Worked example

This creates an invented line table whose `LineTotal` is quantity times unit price. The calculator uses the new table occurrence as its context.

<!-- docs-example: run -->
```sh
printf '%s\n' '[{"op":"createTable","name":"BuildLines","fields":[{"name":"Quantity","type":"number"},{"name":"UnitPrice","type":"number"},{"name":"LineTotal","type":"number","kind":"calculation","calculation":"Quantity * UnitPrice"}]}]' > changes.json
tabularius design ~/Databases Invoices changes.json
```

## Check afterwards

- Enter quantity `3` and unit price `4`; confirm the calculated value is `12`.
- Change one input and confirm the result updates.
- Run the formula check in Design mode and review [calculation privileges](../../calculation-privileges.md) before exposing a result to restricted accounts.

See [Design mode](../../design-mode.md), [calculation privileges](../../calculation-privileges.md), the [REST reference](../../reference/rest.md) for formula-check routes, and [known differences](../../known-differences.md). This example states Tabularius calculation behavior; it does not assert FileMaker evaluation parity.

## Read a QR code from a container

`ReadQRCode ( Scan )` returns the QR text from an image container. It runs in stored calculations, scripts, schedules and server evaluation using the container's bytes; no camera or network is used. PNG, GIF and baseline JPEG images are decoded here. QR Model 2 supports versions 1 through 40, the four correction levels, numeric, alphanumeric, byte and kanji modes, and ECI 26 for UTF-8. Without an ECI, byte data is read as UTF-8 when valid and ISO-8859-1 otherwise.

An image without a QR code returns empty text. This answer has not been compared with FileMaker. <!-- known-difference: SQL and calculations ;; ReadQRCode returns empty text when an image has no QR code; reference-product behavior is unverified ;; A calculation can see an empty result rather than a reference-product error or other value ;; A FileMaker run with a generated image containing no QR code -->

When several QR codes are present, the first successfully decoded code scanning from the top left is returned. The reference-product selection order is unverified. <!-- known-difference: SQL and calculations ;; ReadQRCode selects the first successfully decoded QR code scanning from the top left when several are present; reference-product selection order is unverified ;; A picture with several codes may yield different text ;; A FileMaker run with a generated image containing two QR codes -->

An unreadable code, a malformed PNG with repeated or misplaced image headers, or a non-image container returns empty text. The reference-product answer is unverified. <!-- known-difference: SQL and calculations ;; ReadQRCode returns empty text for unreadable codes, malformed PNG headers and non-image containers; reference-product behavior is unverified ;; A damaged code, malformed PNG or container holding other file data gives empty text ;; A FileMaker run with generated unreadable QR, malformed PNG and non-image container data -->

An image whose dimensions exhaust the calculation work budget raises the usual calculation work-budget error before decoding. The reference-product limit is unverified. <!-- known-difference: SQL and calculations ;; ReadQRCode raises the calculation work-budget error for image dimensions that exceed its budget; reference-product limits are unverified ;; A large image stops before decoding rather than returning QR text ;; A FileMaker run with a generated large-header image -->

Progressive JPEG, Micro QR and structured append are unsupported and return empty text. Compatibility for those formats is unverified. <!-- known-difference: SQL and calculations ;; ReadQRCode returns empty text for progressive JPEG, Micro QR and structured append; reference-product behavior is unverified ;; Those images yield empty text even where another reader may decode them ;; A FileMaker run with generated progressive JPEG, Micro QR and structured-append samples -->
