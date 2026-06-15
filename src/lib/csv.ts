// Utilitários para exportar dados em CSV (executado no cliente).

/** Monta uma string CSV a partir de cabeçalhos e linhas. */
export function toCsv(headers: string[], rows: (string | number)[][]): string {
  const esc = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.map(esc).join(",")];
  for (const r of rows) lines.push(r.map(esc).join(","));
  return lines.join("\n");
}

/** Dispara o download de um arquivo CSV no navegador. */
export function downloadCsv(filename: string, csv: string) {
  // O BOM (﻿) ajuda o Excel a reconhecer UTF-8 (acentos).
  const blob = new Blob(["﻿" + csv], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
