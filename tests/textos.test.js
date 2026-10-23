const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");

/*
  Los turnos se nombran con "agenda", no con reserva (ver CLAUDE.md). Se
  revisa el texto que lee la gente: sin comentarios, estilos, scripts ni
  atributos internos, y sin la dirección /reservar, que está impresa en los QR.
*/
function readableText(file) {
  return fs.readFileSync(path.join(root, file), "utf8")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(style|script)\b[\s\S]*?<\/\1>/g, "")
    .replace(/\s(href|src|id|class|for|data-[\w-]+)="[^"]*"/g, "")
    .replace(/\/reservar\b/g, "");
}

function noticesText() {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(root, "assets", "notices-data.js"), "utf8"), context);
  return context.window.SiteNotices.map(({ id, link, ...notice }) => JSON.stringify({ ...notice, label: link?.label })).join("\n");
}

test("los textos para el público dicen agenda, no reserva", () => {
  const carteles = fs.readdirSync(path.join(root, "carteles")).filter((file) => file.endsWith(".html"));
  const sources = {
    "index.html": readableText("index.html"),
    "assets/notices-data.js": noticesText(),
    ...Object.fromEntries(carteles.map((file) => [`carteles/${file}`, readableText(`carteles/${file}`)]))
  };
  const found = Object.entries(sources).flatMap(([file, text]) =>
    [...text.matchAll(/.{0,30}reserv.{0,30}/gi)].map((match) => `${file}: …${match[0].trim()}…`));
  assert.deepEqual(found, []);
});
