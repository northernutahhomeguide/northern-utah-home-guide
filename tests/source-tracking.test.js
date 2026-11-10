"use strict";

const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");
const { JSDOM, VirtualConsole } = require("jsdom");
const NUHG = require("../tracking.js");

const root = path.resolve(__dirname, "..");
const GA_ID = "G-525D6GS03P";
const GA_SNIPPET = `(function(){var q=location.search,s=null;try{if(/[?&]internal=1/.test(q))localStorage.setItem("nuhg_internal","1");if(/[?&]internal=0/.test(q))localStorage.removeItem("nuhg_internal");s=localStorage.getItem("nuhg_internal");}catch(e){}
if(s)return;var g=document.createElement("script");g.async=1;g.src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}";document.head.appendChild(g);
window.dataLayer=window.dataLayer||[];window.gtag=function(){dataLayer.push(arguments);};gtag("js",new Date());gtag("config","${GA_ID}");})();`;
const SECRETS = ["Casey Example", "casey.example@example.com", "500 Example Ave", "person@example.com", "4355550199"];

function htmlFiles() {
  const out = [];
  function walk(dir) {
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      if (name === "node_modules" || name === "tests") continue;
      const stat = fs.statSync(full);
      if (stat.isDirectory()) walk(full);
      else if (name.endsWith(".html")) out.push(full);
    }
  }
  walk(root);
  return out.sort();
}

class Mem {
  constructor() { this.map = new Map(); }
  getItem(key) { return this.map.has(key) ? this.map.get(key) : null; }
  setItem(key, value) { this.map.set(key, String(value)); }
}

function capture(href, referrer, storage, memory, pageHost) {
  return NUHG.captureAttribution({
    href: href,
    referrer: referrer || "",
    pageHost: pageHost || "northernutahhomeguide.com",
    storage: storage || new Mem(),
    memory: memory || {}
  });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function accepted(retained) {
  return NUHG.acceptedBody({ retained: retained !== false });
}

function loadPage(file, options) {
  options = options || {};
  let html = fs.readFileSync(path.join(root, file), "utf8");
  html = html.replace(/<script\s+src="[^"]*"><\/script>/g, "");
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", (error) => errors.push(String(error)));
  virtualConsole.on("error", (error) => errors.push(String(error)));
  const settings = {
    url: options.url || "https://northernutahhomeguide.com/sellers",
    runScripts: "dangerously",
    virtualConsole: virtualConsole,
    beforeParse: function (win) {
      win.__opened = [];
      win.open = function (url) { win.__opened.push(url); return {}; };
      if (options.seed) win.sessionStorage.setItem(NUHG.STORAGE_KEY, options.seed);
      if (options.blockStorage) {
        win.sessionStorage.getItem = function () { throw new Error("blocked"); };
        win.sessionStorage.setItem = function () { throw new Error("blocked"); };
      }
      if (options.beforeParse) options.beforeParse(win);
    }
  };
  if (options.referrer) settings.referrer = options.referrer;
  const dom = new JSDOM(html, settings);
  const win = dom.window;
  win.__errors = errors;
  win.__posts = [];
  win.__navigated = [];
  win.__events = [];
  win.__nuhgGo = function (url) { win.__navigated.push(url); };
  win.fetch = async function (url, opts) {
    const body = opts && opts.body ? JSON.parse(opts.body) : null;
    win.__posts.push({ url: String(url), body: body, method: opts && opts.method });
    if (win.__fetchImpl) return win.__fetchImpl(url, opts);
    throw new Error("unmocked fetch " + url);
  };
  function run(rel) {
    const script = win.document.createElement("script");
    script.textContent = fs.readFileSync(path.join(root, rel), "utf8");
    win.document.body.appendChild(script);
  }
  run("tracking.js");
  if (options.data) run("data.js");
  if (options.site !== false) run("site.js");
  if (options.siteTwice) run("site.js");
  const dialog = win.HTMLDialogElement && win.HTMLDialogElement.prototype;
  if (dialog) {
    dialog.showModal = function () { this.open = true; this.setAttribute("open", ""); };
    dialog.close = function () { this.open = false; this.removeAttribute("open"); };
  }
  if (typeof win.gtag === "function") {
    const orig = win.gtag;
    win.gtag = function () {
      const args = Array.from(arguments);
      win.__events.push(args);
      orig.apply(this, arguments);
      const params = args[2];
      if (params && typeof params.event_callback === "function") params.event_callback();
    };
  }
  return win;
}

function setVal(win, id, value) {
  const el = win.document.getElementById(id);
  assert.ok(el, "missing #" + id);
  el.value = value;
}

function submitForm(win, id) {
  const form = win.document.getElementById(id);
  assert.ok(form, "missing form #" + id);
  form.dispatchEvent(new win.Event("submit", { bubbles: true, cancelable: true }));
}

function leadEvents(win) {
  return (win.__events || []).filter((args) => args[0] === "event" && args[1] === "generate_lead");
}

function eventNames(win) {
  return (win.__events || []).filter((args) => args[0] === "event").map((args) => args[1]);
}

function assertCleanEvent(params) {
  const keys = Object.keys(params).filter((key) => key !== "transport_type" && key !== "event_callback").sort();
  assert.deepEqual(keys, ["follow_up", "form_name", "lead_type"]);
  assert.equal(params.value, undefined);
  assert.equal(params.currency, undefined);
  const text = JSON.stringify(params);
  for (const secret of SECRETS) assert.equal(text.includes(secret), false, secret);
}

function fillValue(win) {
  setVal(win, "v_name", "Casey Example");
  setVal(win, "v_contact", "casey.example@example.com");
  setVal(win, "v_addr", "500 Example Ave");
  setVal(win, "v_msg", "Please call 4355550199");
  win.document.getElementById("v_ok").checked = true;
}

test("every page keeps the one production GA4 tag and loads tracking once", () => {
  const files = htmlFiles();
  assert.ok(files.length >= 40);
  for (const file of files) {
    const text = fs.readFileSync(file, "utf8");
    const rel = path.relative(root, file);
    assert.equal(text.split(GA_SNIPPET).length - 1, 1, rel);
    assert.deepEqual(text.match(/G-[A-Z0-9]+/g), [GA_ID, GA_ID], rel);
    assert.equal(text.includes("googletagmanager.com/gtag/js?id=" + GA_ID), true, rel);
    assert.equal((text.match(/googletagmanager\.com\/gtag\/js/g) || []).length, 1, rel);
    assert.equal(text.includes("GTM-"), false, rel);
    assert.equal(text.includes("G-XXXXXXXXXX"), false, rel);
    const tracking = rel === "404.html" ? "/tracking.js?v=18" : (rel.startsWith("areas/") ? "../tracking.js?v=18" : "tracking.js?v=18");
    assert.equal((text.match(new RegExp(tracking.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length, 1, rel);
    assert.equal(text.includes("site.js?v=17"), false, rel);
    const site = (text.match(/site\.js\?v=18/g) || []).length;
    assert.equal(site, rel === "404.html" ? 0 : 1, rel);
    const guardAt = text.indexOf('if(s)return;var g=document.createElement("script")');
    const tagAt = text.indexOf("googletagmanager.com/gtag/js");
    assert.ok(guardAt !== -1 && guardAt < tagAt, rel);
  }
});

test("GA snippet skips internal traffic and configures the property once", () => {
  const normal = loadPage("sellers.html", { site: false, url: "https://northernutahhomeguide.com/sellers" });
  const configs = [...normal.dataLayer].filter((entry) => entry[0] === "config");
  assert.equal(configs.length, 1);
  assert.equal(configs[0][1], GA_ID);
  assert.equal(normal.document.querySelectorAll('script[src*="googletagmanager.com/gtag/js"]').length, 1);
  assert.equal(normal.localStorage.getItem("nuhg_internal"), null);

  const hidden = loadPage("sellers.html", { site: false, url: "https://northernutahhomeguide.com/sellers?internal=1" });
  assert.equal(hidden.gtag, undefined);
  assert.equal(hidden.dataLayer, undefined);
  assert.equal(hidden.document.querySelectorAll('script[src*="googletagmanager.com/gtag/js"]').length, 0);
  assert.equal(hidden.localStorage.getItem("nuhg_internal"), "1");

  const cleared = loadPage("sellers.html", {
    site: false,
    url: "https://northernutahhomeguide.com/sellers?internal=0",
    beforeParse: function (win) { win.localStorage.setItem("nuhg_internal", "1"); }
  });
  assert.equal(cleared.localStorage.getItem("nuhg_internal"), null);
  assert.equal([...cleared.dataLayer].filter((entry) => entry[0] === "config").length, 1);
});

test("first visit keeps campaign, referrer, and landing across later pages", () => {
  const storage = new Mem();
  const first = capture(
    "https://northernutahhomeguide.com/?utm_source=google&utm_medium=gbp-post&utm_campaign=spring&email=person@example.com&gclid=CLICKTOKEN#reviews",
    "https://www.google.com/search?q=cache+valley+homes&email=person@example.com",
    storage
  );
  assert.equal(first.landing, "https://northernutahhomeguide.com/?utm_source=google&utm_medium=gbp-post&utm_campaign=spring");
  assert.equal(first.referrer, "https://www.google.com");
  assert.equal(first.utm.utm_source, "google");
  assert.equal(first.utm.utm_medium, "gbp-post");
  assert.equal(first.utm.utm_campaign, "spring");
  assert.equal(JSON.stringify(first).includes("person@example.com"), false);
  assert.equal(JSON.stringify(first).includes("gclid"), false);
  assert.equal(JSON.stringify(first).includes("cache+valley"), false);

  const second = capture(
    "https://northernutahhomeguide.com/sellers#value",
    "https://northernutahhomeguide.com/?utm_source=google&utm_medium=gbp-post&utm_campaign=spring",
    storage
  );
  assert.equal(second.landing, first.landing);
  assert.equal(second.referrer, "https://www.google.com");
  assert.equal(second.utm.utm_campaign, "spring");
  assert.equal(second.landing.includes("#"), false);
});

test("direct, social, same-site, blocked, and malformed visits stay sanitized", () => {
  const direct = capture("https://northernutahhomeguide.com/buyers", "");
  assert.equal(direct.referrer, "");
  assert.equal(direct.landing, "https://northernutahhomeguide.com/buyers");
  assert.equal(NUHG.formatSourceLine(direct).startsWith("Original source: direct | first page "), true);

  const facebook = capture(
    "https://northernutahhomeguide.com/areas/logan",
    "https://user:pass@m.facebook.com/l.php?u=https%3A%2F%2Fexample.com&token=secret"
  );
  assert.equal(facebook.referrer, "https://m.facebook.com");
  assert.equal(JSON.stringify(facebook).includes("token"), false);
  assert.equal(JSON.stringify(facebook).includes("user:pass"), false);

  const sameSite = capture(
    "https://northernutahhomeguide.com/sellers",
    "https://www.northernutahhomeguide.com/areas/logan?utm_source=google&email=person@example.com"
  );
  assert.equal(sameSite.referrer, "");
  assert.equal(sameSite.utm.utm_source, undefined);

  const memory = {};
  const blocked = { getItem: function () { throw new Error("blocked"); }, setItem: function () { throw new Error("blocked"); } };
  const kept = capture("https://northernutahhomeguide.com/?utm_source=google&utm_medium=cpc&utm_campaign=spring", "", blocked, memory);
  const again = capture("https://northernutahhomeguide.com/sellers", "https://northernutahhomeguide.com/", blocked, memory);
  assert.equal(again.landing, kept.landing);
  assert.equal(again.utm.utm_medium, "cpc");
  const fresh = capture("https://northernutahhomeguide.com/sellers", "", blocked, {});
  assert.equal(fresh.landing, "https://northernutahhomeguide.com/sellers");

  const broken = new Mem();
  broken.setItem(NUHG.STORAGE_KEY, "{");
  const repaired = capture("https://northernutahhomeguide.com/lakes", "", broken);
  assert.equal(repaired.landing, "https://northernutahhomeguide.com/lakes");
  assert.doesNotThrow(function () { JSON.parse(broken.getItem(NUHG.STORAGE_KEY)); });

  const dirty = new Mem();
  dirty.setItem(NUHG.STORAGE_KEY, JSON.stringify({
    v: 1,
    landing: "https://northernutahhomeguide.com/?utm_source=google&utm_medium=gbp-post&utm_campaign=spring&email=person@example.com#x",
    referrer: "https://user:pass@www.google.com/search?q=secret",
    utm: { utm_source: "google", utm_medium: "gbp-post", utm_campaign: "spring", utm_term: "person@example.com", utm_content: "<script>", email: "person@example.com" },
    name: "Casey Example",
    phone: "4355550199"
  }));
  const cleaned = capture("https://northernutahhomeguide.com/sellers", "https://evil.example/ignore", dirty);
  const stored = dirty.getItem(NUHG.STORAGE_KEY);
  assert.equal(stored.includes("person@example.com"), false);
  assert.equal(stored.includes("user:pass"), false);
  assert.equal(stored.includes("q=secret"), false);
  assert.equal(stored.includes("<script>"), false);
  assert.equal(stored.includes("Casey Example"), false);
  assert.equal(cleaned.utm.utm_source, "google");
  assert.equal(cleaned.utm.utm_term, undefined);
  assert.equal(cleaned.referrer, "https://www.google.com");
  assert.equal(cleaned.landing.includes("sellers"), false);

  assert.equal(NUHG.cleanToken("4355550199", 80, "utm_source"), "");
  assert.equal(NUHG.cleanToken("person@example.com", 80, "utm_campaign"), "");
  assert.equal(NUHG.cleanToken("=HYPERLINK(1)", 80, "utm_source"), "");
  assert.equal(NUHG.cleanToken("1234567890123", 80, "utm_id"), "1234567890123");
  assert.equal(NUHG.sanitizeLanding("javascript:alert(1)"), "");
  assert.equal(NUHG.sanitizeLanding("https://evil.example/phish?utm_source=google"), "");
});

test("worker keeps source in the existing Details cell and still drops a no-consent guide", () => {
  const attribution = {
    landing: "https://northernutahhomeguide.com/?utm_source=google&utm_medium=gbp-post&utm_campaign=spring&email=person@example.com",
    referrer: "https://www.google.com/search?q=secret",
    utm_source: "google",
    utm_medium: "gbp-post",
    utm_campaign: "spring",
    email: "person@example.com",
    name: "Casey Example",
    phone: "4355550199",
    token: "secret-token"
  };
  const page = "https://northernutahhomeguide.com/ask?town=Logan&topic=Buying%20a%20home&email=person@example.com&sig=abc&token=zzz#note";
  const existing = "Question about Logan.\nProperty note stays here.";

  const value = NUHG.retentionDecision("/api/value", { consent: false, page: page, attribution: attribution }, existing);
  assert.equal(value.accepted, true);
  assert.equal(value.retained, true);
  assert.equal(value.notifyChristina, true);
  assert.deepEqual(Object.keys(value.sheet).sort(), ["details", "page"]);
  assert.equal(value.sheet.page, "https://northernutahhomeguide.com/ask?town=Logan&topic=Buying+a+home");
  assert.equal(value.sheet.details.startsWith(existing), true);
  assert.equal(value.sheet.details.includes("Original source: campaign google / gbp-post / spring"), true);
  assert.equal(value.sheet.details.includes("person@example.com"), false);
  assert.equal(value.sheet.details.includes("secret-token"), false);
  assert.equal(value.sheet.details.includes("q=secret"), false);
  assert.ok(value.sheet.details.length <= NUHG.DETAILS_MAX);

  const guide = NUHG.retentionDecision("/api/guide", { consent: false, page: page, attribution: attribution }, "Town: Logan");
  assert.equal(guide.accepted, true);
  assert.equal(guide.retained, false);
  assert.equal(guide.notifyChristina, false);
  assert.equal(guide.sheet, null);
  assert.equal(guide.sourceLine, "");
  const guideBody = NUHG.acceptedBody(guide);
  assert.equal(NUHG.leadAccepted(guideBody), true);
  assert.deepEqual(NUHG.leadParams("town_guide", false, guideBody), {
    form_name: "town_guide",
    follow_up: "no",
    lead_type: "guide_email"
  });

  const opted = NUHG.retentionDecision("/api/guide", { consent: true, page: "https://northernutahhomeguide.com/areas/logan", attribution: attribution }, "Town: Logan");
  assert.equal(opted.notifyChristina, true);
  assert.equal(opted.sheet.details.includes("Town: Logan"), true);
  assert.equal(opted.sheet.details.includes("Original source:"), true);
  assert.equal(opted.sheet.page, "https://northernutahhomeguide.com/areas/logan");

  const signup = NUHG.retentionDecision("/api/signup", { page: "https://northernutahhomeguide.com/school-changes", attribution: { landing: "https://northernutahhomeguide.com/school-changes", referrer: "" } }, "Districts: Cache County");
  assert.equal(signup.notifyChristina, true);
  assert.equal(signup.sheet.details.includes("Districts: Cache County"), true);
  assert.equal(signup.sheet.details.includes("Original source: direct"), true);

  const preview = NUHG.sanitizeAttribution({
    landing: "https://preview.pages.dev/?utm_source=google&utm_medium=gbp-post&utm_campaign=spring",
    referrer: "https://www.google.com/search?q=secret",
    utm_source: "google",
    utm_medium: "gbp-post",
    utm_campaign: "spring"
  });
  assert.equal(preview.landing, "");
  assert.equal(preview.utm.utm_source, "google");
  const previewLine = NUHG.formatSourceLine(preview);
  assert.equal(previewLine.includes("pages.dev"), false);
  assert.equal(previewLine.includes("google / gbp-post / spring"), true);
  assert.equal(previewLine.includes("q=secret"), false);

  const long = "KEEP-THIS-REQUEST " + "x".repeat(2000);
  const merged = NUHG.sheetDetails(long, NUHG.formatSourceLine(attribution));
  assert.equal(merged.startsWith("KEEP-THIS-REQUEST"), true);
  assert.equal(merged.includes("Original source:"), true);
  assert.ok(merged.length <= NUHG.DETAILS_MAX);

  const formula = NUHG.sheetDetails('=HYPERLINK("http://evil.example")', "Original source: direct");
  assert.equal(formula.startsWith("'"), true);
  assert.equal(NUHG.sheetDetails("+1", "Original source: direct").startsWith("'"), true);
  assert.equal(NUHG.sheetDetails("-1", "Original source: direct").startsWith("'"), true);
  assert.equal(NUHG.sheetDetails("@cmd", "Original source: direct").startsWith("'"), true);
  assert.equal(NUHG.retentionDecision("/api/other", { consent: true, attribution: attribution }, "nope").accepted, false);
  assert.equal(NUHG.leadAccepted(NUHG.silentDropBody()), false);
  assert.equal(NUHG.leadAccepted(NUHG.repeatBody()), false);
  assert.equal(NUHG.leadAccepted({ ok: true, accepted: true, repeat: true }), false);
  assert.equal(NUHG.leadAccepted({ ok: false, accepted: true }), false);
  assert.equal(NUHG.leadParams("not_a_form", true, accepted(true)), null);
});

test("trackAccepted fires one generate_lead and never blocks the form", async () => {
  const calls = [];
  function win(extra) {
    const out = {
      localStorage: { getItem: function (key) { return extra && extra.internal && key === "nuhg_internal" ? "1" : null; } },
      gtag: function (_type, _name, params) {
        calls.push(params);
        if (extra && extra.double && params.event_callback) {
          params.event_callback();
          params.event_callback();
        } else if (!(extra && extra.silentGtag) && params.event_callback) params.event_callback();
      }
    };
    if (extra && extra.noGtag) delete out.gtag;
    return out;
  }
  let done = 0;
  NUHG.trackAccepted(win(), "home_value", { followUp: true }, accepted(true), function () { done += 1; });
  assert.equal(done, 1);
  assert.equal(calls.length, 1);
  assertCleanEvent(calls[0]);
  assert.equal(calls[0].form_name, "home_value");
  assert.equal(calls[0].follow_up, "yes");
  assert.equal(calls[0].lead_type, "retained");

  const before = calls.length;
  let skipped = 0;
  NUHG.trackAccepted(win(), "town_guide", { followUp: false }, NUHG.silentDropBody(), function () { skipped += 1; });
  NUHG.trackAccepted(win(), "town_guide", { followUp: true }, NUHG.repeatBody(), function () { skipped += 1; });
  NUHG.trackAccepted(win(), "listing_alerts", { followUp: true, honeypot: "https://spam.example" }, accepted(true), function () { skipped += 1; });
  NUHG.trackAccepted(win({ internal: true }), "ask_christina", { followUp: false }, accepted(true), function () { skipped += 1; });
  NUHG.trackAccepted(win({ noGtag: true }), "school_alerts", { followUp: true }, accepted(true), function () { skipped += 1; });
  NUHG.trackAccepted(win(), "nope", { followUp: true }, accepted(true), function () { skipped += 1; });
  assert.equal(skipped, 6);
  assert.equal(calls.length, before);

  let doubled = 0;
  NUHG.trackAccepted(win({ double: true }), "town_comparison", { followUp: true }, accepted(true), function () { doubled += 1; });
  assert.equal(doubled, 1);
  assert.equal(calls[calls.length - 1].lead_type, "retained");
  const guideOnly = NUHG.leadParams("town_comparison", true, { ok: true, accepted: true, retained: false });
  assert.deepEqual(guideOnly, { form_name: "town_comparison", follow_up: "no", lead_type: "guide_email" });

  let late = 0;
  NUHG.trackAccepted(win({ silentGtag: true }), "town_quiz", { followUp: false }, accepted(true), function () { late += 1; });
  assert.equal(late, 0);
  await delay(450);
  assert.equal(late, 1);
});

test("home value keeps the first source and counts only an accepted submit", async () => {
  const seed = JSON.stringify({
    v: 1,
    landing: "https://northernutahhomeguide.com/?utm_source=google&utm_medium=gbp-post&utm_campaign=spring&email=person@example.com#reviews",
    referrer: "https://www.google.com/search?q=logan+homes&email=person@example.com",
    utm: { utm_source: "google", utm_medium: "gbp-post", utm_campaign: "spring", utm_term: "person@example.com" }
  });
  const win = loadPage("sellers.html", {
    url: "https://northernutahhomeguide.com/sellers#value",
    referrer: "https://northernutahhomeguide.com/",
    seed: seed,
    siteTwice: true
  });
  assert.equal(win.document.querySelectorAll("#v_ok").length, 1);
  assert.equal(win.sessionStorage.getItem(NUHG.STORAGE_KEY).includes("person@example.com"), false);
  win.__fetchImpl = async function () { return { ok: true, json: async function () { return accepted(true); } }; };

  submitForm(win, "valueForm");
  await delay(20);
  assert.equal(win.__posts.length, 0);
  assert.equal(leadEvents(win).length, 0);

  fillValue(win);
  submitForm(win, "valueForm");
  submitForm(win, "valueForm");
  await delay(450);
  assert.equal(win.__posts.length, 1);
  assert.equal(win.__posts[0].url, "/api/value");
  assert.equal(win.__posts[0].body.source, "value");
  assert.equal(win.__posts[0].body.page, "https://northernutahhomeguide.com/sellers");
  assert.equal(win.__posts[0].body.attribution.landing, "https://northernutahhomeguide.com/?utm_source=google&utm_medium=gbp-post&utm_campaign=spring");
  assert.equal(win.__posts[0].body.attribution.referrer, "https://www.google.com");
  assert.equal(win.__posts[0].body.attribution.utm_campaign, "spring");
  assert.equal(JSON.stringify(win.__posts[0].body.attribution).includes("person@example.com"), false);
  assert.equal(JSON.stringify(win.__posts[0].body.attribution).includes("q=logan"), false);
  assert.equal(leadEvents(win).length, 1);
  assert.equal(leadEvents(win)[0][2].form_name, "home_value");
  assert.equal(leadEvents(win)[0][2].follow_up, "yes");
  assert.equal(leadEvents(win)[0][2].lead_type, "retained");
  assertCleanEvent(leadEvents(win)[0][2]);
  assert.deepEqual(win.__navigated, ["thanks-christina?type=value"]);
  assert.equal(eventNames(win).includes("guide_email"), false);

  const spam = loadPage("sellers.html", { url: "https://northernutahhomeguide.com/sellers" });
  fillValue(spam);
  spam.__fetchImpl = async function () { return { ok: true, json: async function () { return NUHG.silentDropBody(); } }; };
  submitForm(spam, "valueForm");
  await delay(450);
  assert.equal(leadEvents(spam).length, 0);
  assert.deepEqual(spam.__navigated, ["thanks-christina?type=value"]);

  const repeat = loadPage("sellers.html", { url: "https://northernutahhomeguide.com/sellers" });
  fillValue(repeat);
  repeat.__fetchImpl = async function () { return { ok: true, json: async function () { return { ok: true, accepted: true, repeat: true }; } }; };
  submitForm(repeat, "valueForm");
  await delay(450);
  assert.equal(leadEvents(repeat).length, 0);

  const honeypot = loadPage("sellers.html", { url: "https://northernutahhomeguide.com/sellers" });
  fillValue(honeypot);
  setVal(honeypot, "v_web", "https://spam.example");
  honeypot.__fetchImpl = async function () { return { ok: true, json: async function () { return accepted(true); } }; };
  submitForm(honeypot, "valueForm");
  await delay(450);
  assert.equal(leadEvents(honeypot).length, 0);
  assert.equal(honeypot.__posts[0].body.website, "https://spam.example");

  const failed = loadPage("sellers.html", { url: "https://northernutahhomeguide.com/sellers" });
  fillValue(failed);
  failed.__fetchImpl = async function () { return { ok: true, json: async function () { return { ok: false, error: "busy" }; } }; };
  submitForm(failed, "valueForm");
  await delay(40);
  assert.equal(leadEvents(failed).length, 0);
  assert.equal(failed.__navigated.length, 0);
  assert.equal(failed.document.getElementById("v_send").disabled, false);
  assert.match(failed.document.getElementById("v_note").textContent, /didn't go through/);

  const offline = loadPage("sellers.html", { url: "https://northernutahhomeguide.com/sellers" });
  fillValue(offline);
  offline.__fetchImpl = async function () { throw new Error("offline"); };
  submitForm(offline, "valueForm");
  await delay(40);
  assert.equal(leadEvents(offline).length, 0);
  assert.equal(offline.__navigated.length, 0);

  const internal = loadPage("sellers.html", { url: "https://northernutahhomeguide.com/sellers?internal=1" });
  assert.equal(internal.gtag, undefined);
  fillValue(internal);
  internal.__fetchImpl = async function () { return { ok: true, json: async function () { return accepted(true); } }; };
  submitForm(internal, "valueForm");
  await delay(450);
  assert.equal(internal.__posts.length, 1);
  assert.equal(leadEvents(internal).length, 0);
  assert.deepEqual(internal.__navigated, ["thanks-christina?type=value"]);
});

test("ask, guide, listings, schools, and quiz each emit one accepted lead", async () => {
  const ask = loadPage("ask.html", {
    url: "https://northernutahhomeguide.com/ask?town=Logan&topic=Buying%20a%20home&email=person@example.com&sig=abc&token=zzz#note",
    referrer: "https://m.facebook.com/l.php?u=https%3A%2F%2Fexample.com&secret=1"
  });
  submitForm(ask, "askForm");
  await delay(20);
  assert.equal(ask.__posts.length, 0);
  setVal(ask, "a_name", "Casey Example");
  setVal(ask, "a_contact", "casey.example@example.com");
  setVal(ask, "a_msg", "What is 500 Example Ave like?");
  ask.__fetchImpl = async function () { return { ok: true, json: async function () { return accepted(true); } }; };
  submitForm(ask, "askForm");
  await delay(450);
  assert.equal(ask.__posts.length, 1);
  assert.equal(ask.__posts[0].body.source, "ask");
  assert.equal(ask.__posts[0].body.page, "https://northernutahhomeguide.com/ask?town=Logan&topic=Buying+a+home");
  assert.equal(ask.__posts[0].body.attribution.landing, "https://northernutahhomeguide.com/ask");
  assert.equal(ask.__posts[0].body.attribution.referrer, "https://m.facebook.com");
  assert.equal(JSON.stringify(ask.__posts[0].body.attribution).includes("person@example.com"), false);
  assert.equal(JSON.stringify(ask.__posts[0].body.attribution).includes("token"), false);
  assert.equal(leadEvents(ask).length, 1);
  assert.equal(leadEvents(ask)[0][2].form_name, "ask_christina");
  assert.equal(leadEvents(ask)[0][2].lead_type, "retained");
  assertCleanEvent(leadEvents(ask)[0][2]);
  assert.deepEqual(ask.__navigated, ["thanks-christina?type=ask"]);

  const guide = loadPage("areas/logan.html", {
    url: "https://northernutahhomeguide.com/areas/logan",
    referrer: "https://www.facebook.com/posts/1?ref=email&e=person@example.com",
    siteTwice: true
  });
  const townButton = guide.document.querySelector("[data-guide-town='Logan']");
  assert.ok(townButton);
  townButton.click();
  townButton.click();
  assert.equal(guide.document.querySelectorAll("dialog").length, 1);
  const guideForm = guide.document.querySelector("dialog form");
  guideForm.dispatchEvent(new guide.Event("submit", { bubbles: true, cancelable: true }));
  await delay(20);
  assert.equal(guide.__posts.length, 0);
  setVal(guide, "g_email", "casey.example@example.com");
  guide.__fetchImpl = async function () { return { ok: true, json: async function () { return NUHG.acceptedBody({ retained: false }); } }; };
  guideForm.dispatchEvent(new guide.Event("submit", { bubbles: true, cancelable: true }));
  await delay(450);
  assert.equal(guide.__posts.length, 1);
  assert.equal(guide.__posts[0].url, "/api/guide");
  assert.equal(guide.__posts[0].body.consent, false);
  assert.equal(guide.__posts[0].body.kind, "town");
  assert.equal(guide.__posts[0].body.page, "https://northernutahhomeguide.com/areas/logan");
  assert.equal(guide.__posts[0].body.attribution.referrer, "https://www.facebook.com");
  assert.equal(JSON.stringify(guide.__posts[0].body.attribution).includes("person@example.com"), false);
  assert.equal(leadEvents(guide).length, 1);
  assert.equal(leadEvents(guide)[0][2].form_name, "town_guide");
  assert.equal(leadEvents(guide)[0][2].follow_up, "no");
  assert.equal(leadEvents(guide)[0][2].lead_type, "guide_email");
  assert.equal(eventNames(guide).includes("guide_email"), false);
  assert.deepEqual(guide.__navigated, ["../thanks-sent?type=guide"]);

  const compare = loadPage("index.html", {
    data: true,
    url: "https://northernutahhomeguide.com/",
    referrer: ""
  });
  assert.equal(compare.__errors.filter((line) => /site\.js|TypeError|ReferenceError/.test(line)).length, 0, compare.__errors.join("\n"));
  const compareButton = compare.document.querySelector("[data-guide-compare]");
  assert.ok(compareButton);
  compareButton.click();
  setVal(compare, "g_email", "casey.example@example.com");
  compare.document.getElementById("g_ok").checked = true;
  compare.__fetchImpl = async function () { return { ok: true, json: async function () { return accepted(true); } }; };
  compare.document.querySelector("dialog form").dispatchEvent(new compare.Event("submit", { bubbles: true, cancelable: true }));
  await delay(450);
  assert.equal(compare.__posts[0].body.kind, "compare");
  assert.equal(compare.__posts[0].body.consent, true);
  assert.equal(compare.__posts[0].body.attribution.referrer, "");
  assert.equal(leadEvents(compare).length, 1);
  assert.equal(leadEvents(compare)[0][2].form_name, "town_comparison");
  assert.equal(leadEvents(compare)[0][2].follow_up, "yes");
  assert.equal(leadEvents(compare)[0][2].lead_type, "retained");

  const listings = loadPage("sellers.html", {
    url: "https://northernutahhomeguide.com/sellers",
    referrer: "https://www.google.com/search?q=homes",
    siteTwice: true
  });
  const link = listings.document.querySelector('a[href*="christinacacciacarne.kw.com"]');
  link.dispatchEvent(new listings.MouseEvent("click", { bubbles: true, cancelable: true }));
  assert.equal(listings.document.querySelectorAll("dialog").length, 1);
  assert.equal(listings.__opened.length, 0);
  listings.document.querySelector("dialog form").dispatchEvent(new listings.Event("submit", { bubbles: true, cancelable: true }));
  await delay(20);
  assert.equal(listings.__posts.length, 0);
  assert.equal(listings.__opened.length, 0);
  setVal(listings, "l_email", "casey.example@example.com");
  const order = [];
  listings.open = function (url) { order.push("open"); listings.__opened.push(url); return {}; };
  listings.__fetchImpl = async function () { order.push("fetch"); return { ok: false, json: async function () { return { ok: false }; } }; };
  listings.document.querySelector("dialog form").dispatchEvent(new listings.Event("submit", { bubbles: true, cancelable: true }));
  await delay(40);
  assert.deepEqual(order, ["open", "fetch"]);
  assert.equal(leadEvents(listings).length, 0);
  assert.equal(eventNames(listings).includes("listing_alerts_signup"), false);
  assert.equal(listings.__navigated.length, 0);

  const listed = loadPage("sellers.html", { url: "https://northernutahhomeguide.com/sellers" });
  listed.document.querySelector('a[href*="christinacacciacarne.kw.com"]').dispatchEvent(new listed.MouseEvent("click", { bubbles: true, cancelable: true }));
  setVal(listed, "l_email", "casey.example@example.com");
  let openedBeforeFetch = false;
  listed.open = function (url) { openedBeforeFetch = listed.__posts.length === 0; listed.__opened.push(url); return {}; };
  listed.__fetchImpl = async function () { return { ok: true, json: async function () { return accepted(true); } }; };
  listed.document.querySelector("dialog form").dispatchEvent(new listed.Event("submit", { bubbles: true, cancelable: true }));
  await delay(450);
  assert.equal(openedBeforeFetch, true);
  assert.equal(leadEvents(listed).length, 1);
  assert.equal(leadEvents(listed)[0][2].form_name, "listing_alerts");
  assert.equal(leadEvents(listed)[0][2].follow_up, "yes");
  assert.deepEqual(listed.__navigated, ["thanks-sent?type=listings"]);

  const schools = loadPage("school-changes.html", { url: "https://northernutahhomeguide.com/school-changes" });
  setVal(schools, "s_email", "not-an-email");
  submitForm(schools, "schoolAlertForm");
  await delay(20);
  assert.equal(schools.__posts.length, 0);
  setVal(schools, "s_email", "casey.example@example.com");
  schools.document.querySelectorAll('#schoolAlertForm input[name="district"]').forEach(function (box) { box.checked = false; });
  submitForm(schools, "schoolAlertForm");
  await delay(20);
  assert.equal(schools.__posts.length, 0);
  schools.document.querySelector('#schoolAlertForm input[name="district"]').checked = true;
  schools.__fetchImpl = async function () { return { ok: true, json: async function () { return accepted(true); } }; };
  submitForm(schools, "schoolAlertForm");
  await delay(450);
  assert.equal(schools.__posts[0].url, "/api/signup");
  assert.equal(schools.__posts[0].body.kind, "schools");
  assert.equal(leadEvents(schools).length, 1);
  assert.equal(leadEvents(schools)[0][2].form_name, "school_alerts");
  assert.equal(eventNames(schools).includes("school_alerts_signup"), false);
  assert.deepEqual(schools.__navigated, ["thanks-sent?type=alerts"]);

  const quiz = loadPage("town-quiz.html", {
    data: true,
    url: "https://northernutahhomeguide.com/town-quiz",
    referrer: "https://www.google.com/search?q=which+town"
  });
  submitForm(quiz, "quiz");
  await delay(20);
  assert.equal(eventNames(quiz).includes("town_quiz_done"), false);
  quiz.document.querySelector('#quiz [name="commute"][value="Logan"]').checked = true;
  quiz.document.querySelector('#quiz [name="size"][value="city"]').checked = true;
  submitForm(quiz, "quiz");
  await delay(20);
  assert.equal(eventNames(quiz).includes("town_quiz_done"), true);
  assert.equal(leadEvents(quiz).length, 0);
  setVal(quiz, "q_email", "not-an-email");
  submitForm(quiz, "q_lead");
  await delay(20);
  assert.equal(quiz.__posts.length, 0);
  setVal(quiz, "q_name", "Casey Example");
  setVal(quiz, "q_email", "casey.example@example.com");
  setVal(quiz, "q_phone", "4355550199");
  quiz.__fetchImpl = async function () { return { ok: true, json: async function () { return accepted(true); } }; };
  submitForm(quiz, "q_lead");
  await delay(450);
  assert.equal(quiz.__posts.length, 1);
  assert.equal(quiz.__posts[0].body.kind, "quiz");
  assert.equal(quiz.__posts[0].body.attribution.referrer, "https://www.google.com");
  assert.equal(JSON.stringify(quiz.__posts[0].body.attribution).includes("which+town"), false);
  assert.equal(JSON.stringify(quiz.__posts[0].body.attribution).includes("Casey Example"), false);
  const leads = leadEvents(quiz);
  assert.equal(leads.length, 1);
  assert.equal(leads[0][2].form_name, "town_quiz");
  assert.equal(leads[0][2].follow_up, "no");
  assert.equal(leads[0][2].lead_type, "retained");
  assertCleanEvent(leads[0][2]);
  assert.equal(eventNames(quiz).includes("town_quiz_lead"), false);
  assert.deepEqual(quiz.__navigated, ["thanks-sent?type=quiz"]);

  const blocked = loadPage("sellers.html", {
    url: "https://northernutahhomeguide.com/sellers",
    blockStorage: true
  });
  fillValue(blocked);
  blocked.__fetchImpl = async function () { return { ok: true, json: async function () { return accepted(true); } }; };
  submitForm(blocked, "valueForm");
  await delay(450);
  assert.equal(blocked.__posts.length, 1);
  assert.equal(blocked.__posts[0].body.attribution.landing, "https://northernutahhomeguide.com/sellers");
  assert.equal(leadEvents(blocked).length, 1);
});
