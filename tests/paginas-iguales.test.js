const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

/*
  La página para anular un turno (api/anular-turno.js) se arma aparte, pero
  carga las mismas fuentes y el mismo styles.css que index.html. Si se cambia
  uno solo, la página de anular queda con otra letra o con un CSS viejo.
*/
const read = (file) => fs.readFileSync(path.join(__dirname, "..", file), "utf8");
const index = read("index.html");
const cancel = read("api/anular-turno.js");

test("la página de anular carga las mismas fuentes de Google que index.html", () => {
  const fromIndex = index.match(/href="(https:\/\/fonts\.googleapis\.com\/css2\?[^"]+)"/)[1];
  const fromCancel = cancel.match(/const FONTS_URL = "([^"]+)";/)[1];
  assert.equal(fromCancel, fromIndex);
});

test("la página de anular pide la misma versión de styles.css que index.html", () => {
  const fromIndex = index.match(/assets\/styles\.css\?v=([^"]+)"/)[1];
  const fromCancel = cancel.match(/\/assets\/styles\.css\?v=([^"]+)"/)?.[1];
  assert.equal(fromCancel, fromIndex);
});
