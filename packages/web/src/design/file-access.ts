// File Access uses the existing Manage Security controls and Full Access session.
import { h, button, toast } from './dom.ts';
import type { Sec } from '../security/main.ts';
import { plainMessage, httpProblem } from '../http-problem.ts';
import { replyJson, NOT_TABULARIUS_DATA } from '../json-reply.ts';

interface FileAccess {
  protect: boolean;
  sameHost: boolean;
  authorized: { fileId: string; names: string[]; at: string; by: string }[];
  hosted: string[];
}

export function fileAccessTab(sec: Sec): HTMLElement {
  const root = h('div', { class: 'd-stack', 'aria-busy': 'true' }, h('p', { role: 'status' }, 'Loading File Access…'));
  let busy = false;
  const call = async (operation = '', body?: unknown): Promise<FileAccess> => {
    const response = await fetch(`/tabularius/design/v1/databases/${encodeURIComponent(sec.client.db)}/file-access${operation ? '/' + operation : ''}`, {
      method: operation ? 'POST' : 'GET',
      headers: { authorization: `Bearer ${sec.client.token}`, ...(operation ? { 'content-type': 'application/json' } : {}) },
      ...(operation ? { body: JSON.stringify(body ?? {}) } : {}),
    });
    const result = await replyJson(response);
    if (!response.ok) throw new Error(result?.error?.message ?? httpProblem(response.status));
    if (!result) throw new Error(NOT_TABULARIUS_DATA);
    return result;
  };
  const change = async (operation: string, body?: unknown) => {
    if (busy) return;
    busy = true;
    root.setAttribute('aria-busy', 'true');
    root.querySelectorAll('button, input, select').forEach((control) => (control as HTMLInputElement).disabled = true);
    try { render(await call(operation, body)); toast('File Access updated', 'info'); }
    catch (error) { toast(plainMessage(error)); }
    finally {
      busy = false;
      root.setAttribute('aria-busy', 'false');
      root.querySelectorAll('button, input, select').forEach((control) => (control as HTMLInputElement).disabled = false);
    }
  };
  const render = (state: FileAccess) => {
    const protect = h('input', { type: 'checkbox', checked: state.protect ? '' : false });
    const sameHost = h('input', { type: 'checkbox', checked: state.sameHost ? '' : false });
    const picker = h('select', { 'aria-label': 'Hosted file to authorize' },
      h('option', { value: '' }, 'Choose a hosted file…'), ...state.hosted.map((name) => h('option', { value: name }, name)));
    root.replaceChildren(
      h('h2', {}, 'File Access'),
      h('p', { class: 'd-hint' }, 'Control which files may use this file’s tables, layouts, scripts and value lists. Record privileges still apply.'),
      h('label', {}, protect, ' Require full access privileges to use references to this file'),
      h('label', {}, sameHost, ' All files must be on the same host'),
      h('p', { class: 'd-hint' }, 'All files hosted by this server satisfy the same-host condition. Full Access is required in both files to authorize a file.'),
      button('Save options', () => void change('set', { protect: protect.checked, sameHost: sameHost.checked })),
      state.authorized.length ? h('table', { class: 'sec-table' },
        h('thead', {}, h('tr', {}, h('th', {}, 'Authorized file names'), h('th', {}, 'Authorized on'), h('th', {}, 'Account'), h('th', {}, 'Action'))),
        h('tbody', {}, ...state.authorized.map((entry) => h('tr', {},
          h('td', {}, entry.names.join('; ')), h('td', {}, new Date(entry.at).toLocaleString()), h('td', {}, entry.by),
          h('td', {}, button('Remove', () => void change('remove', { fileId: entry.fileId }), { 'aria-label': `Remove authorization for ${entry.names.join('; ')}` }))))))
        : h('p', {}, 'No files are authorized. When protection is on, references through data sources are refused.'),
      h('div', { class: 'd-inline-form' }, picker, button('Authorize', () => {
        if (!picker.value) { picker.focus(); return; }
        void change('authorize', { file: picker.value });
      })),
      button('Reset All…', () => {
        if (confirm('Reset this file’s identity? Every file that authorized this file must authorize its new identity again. This file keeps its authorization list.')) void change('reset');
      }, { class: 'danger' }),
    );
    root.setAttribute('aria-busy', 'false');
  };
  const load = async () => {
    try { render(await call()); }
    catch (error) {
      root.setAttribute('aria-busy', 'false');
      root.replaceChildren(h('p', { role: 'alert' }, plainMessage(error)), button('Retry', () => void load()));
    }
  };
  void load();
  return root;
}
