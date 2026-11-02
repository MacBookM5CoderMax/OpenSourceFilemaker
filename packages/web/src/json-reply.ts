// Browser JSON parser messages differ across browsers and expose parser details.
export const NOT_TABULARIUS_DATA = 'The server answered with something that is not Tabularius data. If Tabularius is behind a proxy or a sign-in page, check that /tabularius/ and /fmi/ reach it.';

export async function replyJson(r: Response): Promise<any> {
  try {
    return await r.json();
  } catch {
    return undefined;
  }
}

export function parseJsonFile(text: string, what: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`This file is not ${what}: it is not JSON.`);
  }
}
