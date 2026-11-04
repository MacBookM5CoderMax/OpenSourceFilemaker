// The text of a reply for an assertion message, read only when the status is not the expected one.
//
// `assert.equal(r.status, 200, await r.clone().text())` made a clone of every reply, passing or not. On Node 22.20 (the
// version in .nvmrc, with undici 6.21) a clone that is garbage collected cancels the original's body, so a later read of
// `r` fails with "Body is unusable: Body has already been read", depending on when the collector runs. Here the clone is
// made only when the assertion is about to fail anyway, and then the test is over. Never call clone() on a reply in a test
// (no-response-clone.test.ts checks).

export async function whyNot(response: Response, ...expected: number[]): Promise<string | undefined> {
  return expected.includes(response.status) ? undefined : await response.clone().text();
}
