/*
  First-visit source for northernutahhomeguide.com.

  The browser remembers the first page of this tab, the approved campaign tags,
  and the external referrer (site name only) in sessionStorage. Each form post
  includes that as "attribution", plus a separate sanitized "page" for the page
  the form was sent from. A new tab starts a new record. Storage failures never
  block the form.

  generate_lead is sent only when the worker says the submit was really accepted:
  {ok:true, accepted:true} and not repeat:true. {ok:true} with no accepted flag
  is the existing silent response for honeypots and too-fast submits and must
  not be counted. {ok:true, repeat:true} must not be counted again.

  The worker (home-value-worker) is not in this repository. Whoever deploys it
  should copy sanitizeAttribution, submitPage, formatSourceLine, and sheetDetails
  from this file and then:

  1. Real accept: respond {ok:true, accepted:true, retained:true or false}.
     Honeypot and too-fast stay {ok:true} with no accepted flag.
     A throttled repeat stays {ok:true, repeat:true} with no accepted flag.
  2. /api/guide with consent not strictly true: email the visitor the guide
     only. Do not email Christina and do not add a sheet row just to store
     the source. Still return accepted:true when that guide email was sent.
  3. For every retained lead (/api/value, consented /api/guide, /api/signup),
     put formatSourceLine() in Christina's notice and sheetDetails() in the
     existing Details cell. Keep the submit URL in the existing Page cell
     via submitPage(). Do not add or rename sheet columns. Details stays
     within 1,500 characters. Do not log raw request bodies.
  4. retentionDecision() below is the rule to follow. It does not send mail.
*/
(function (root) {
  "use strict";

  var STORAGE_KEY = "nuhg_attr";
  var UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "utm_id"];
  var TOKEN_MAX = 80;
  var URL_MAX = 300;
  var REF_MAX = 120;
  var SOURCE_MAX = 500;
  var DETAILS_MAX = 1500;
  var SITE = "northernutahhomeguide.com";
  var FORMS = {
    home_value: 1,
    ask_christina: 1,
    town_guide: 1,
    town_comparison: 1,
    listing_alerts: 1,
    school_alerts: 1,
    town_quiz: 1
  };

  function clip(value, max) {
    var s = String(value == null ? "" : value);
    return s.length > max ? s.slice(0, max) : s;
  }

  function hostOf(href) {
    try { return new URL(href).hostname.toLowerCase().replace(/\.$/, ""); }
    catch (e) { return ""; }
  }

  function allowedHost(host) {
    host = String(host || "").toLowerCase().replace(/\.$/, "");
    if (!host) return false;
    if (host === SITE || host.slice(-(SITE.length + 1)) === "." + SITE) return true;
    return host === "localhost" || host === "127.0.0.1";
  }

  function landingAllowed(host, pageHost) {
    if (allowedHost(host)) return true;
    pageHost = String(pageHost || "").toLowerCase().replace(/\.$/, "");
    return !!pageHost && host === pageHost;
  }

  function sameSite(host, pageHost) {
    host = String(host || "").toLowerCase().replace(/\.$/, "");
    pageHost = String(pageHost || "").toLowerCase().replace(/\.$/, "");
    if (!host || !pageHost) return false;
    if (host === pageHost) return true;
    return allowedHost(host) && allowedHost(pageHost);
  }

  function cleanToken(raw, max, field) {
    if (raw == null) return "";
    var s = String(raw).replace(/[\u0000-\u001F\u007F]/g, "").trim().replace(/\s+/g, " ");
    if (!s) return "";
    if (s.length > max) s = s.slice(0, max).trim();
    if (!s) return "";
    if (s.indexOf("@") !== -1) return "";
    if (/[<>"'`\\/?#&=%:]/.test(s)) return "";
    if (!/^[A-Za-z0-9][A-Za-z0-9._~ +-]*$/.test(s)) return "";
    var digits = s.replace(/\D/g, "");
    if (field !== "utm_id" && digits.length >= 7) return "";
    return s;
  }

  function utmFromUrl(href) {
    var utm = {};
    var url;
    try { url = new URL(href); } catch (e) { return utm; }
    for (var i = 0; i < UTM_KEYS.length; i++) {
      var key = UTM_KEYS[i];
      var value = cleanToken(url.searchParams.get(key), TOKEN_MAX, key);
      if (value) utm[key] = value;
    }
    return utm;
  }

  function pickUtm(source) {
    var utm = {};
    if (!source || typeof source !== "object") return utm;
    var nested = source.utm && typeof source.utm === "object" ? source.utm : null;
    for (var i = 0; i < UTM_KEYS.length; i++) {
      var key = UTM_KEYS[i];
      var raw = source[key] != null ? source[key] : (nested ? nested[key] : null);
      var value = cleanToken(raw, TOKEN_MAX, key);
      if (value) utm[key] = value;
    }
    return utm;
  }

  function sanitizeUrl(href, options) {
    options = options || {};
    var max = options.max || URL_MAX;
    var url;
    try { url = new URL(href); } catch (e) { return ""; }
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    if (!landingAllowed(url.hostname, options.pageHost || "")) return "";
    var path = url.pathname || "/";
    if (path.indexOf("@") !== -1) path = "/";
    var base = url.origin + path;
    if (base.length > max) return base.slice(0, max);
    var params = new URLSearchParams();
    function add(key, value) {
      if (!value) return;
      params.set(key, value);
      var candidate = base + "?" + params.toString();
      if (candidate.length > max) params.delete(key);
    }
    for (var i = 0; i < UTM_KEYS.length; i++) {
      add(UTM_KEYS[i], cleanToken(url.searchParams.get(UTM_KEYS[i]), TOKEN_MAX, UTM_KEYS[i]));
    }
    var extra = options.extra || [];
    for (var j = 0; j < extra.length; j++) {
      add(extra[j], cleanToken(url.searchParams.get(extra[j]), 60, extra[j]));
    }
    var query = params.toString();
    return query ? base + "?" + query : base;
  }

  function sanitizeLanding(href, options) {
    return sanitizeUrl(href, { max: URL_MAX, pageHost: options && options.pageHost });
  }

  function submitPage(href) {
    return sanitizeUrl(href, { max: URL_MAX, extra: ["town", "topic"] });
  }

  function sanitizeReferrer(referrer, pageHost) {
    if (!referrer) return "";
    var url;
    try { url = new URL(referrer); } catch (e) { return ""; }
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    var host = url.hostname.toLowerCase().replace(/\.$/, "");
    if (!host || sameSite(host, pageHost || "")) return "";
    var origin = url.origin;
    if (!origin || origin === "null" || origin.length > REF_MAX) return "";
    return origin;
  }

  function sanitizeAttribution(input) {
    var src = input && typeof input === "object" ? input : {};
    var landing = sanitizeLanding(src.landing || "", {});
    var utm = pickUtm(src);
    var urlUtm = landing ? utmFromUrl(landing) : {};
    for (var i = 0; i < UTM_KEYS.length; i++) {
      var key = UTM_KEYS[i];
      if (urlUtm[key]) utm[key] = urlUtm[key];
    }
    var pageHost = hostOf(landing) || SITE;
    return {
      v: 1,
      landing: landing,
      referrer: sanitizeReferrer(src.referrer || "", pageHost),
      utm: utm
    };
  }

  function readStorage(storage, pageHost) {
    if (!storage || typeof storage.getItem !== "function") return null;
    var raw;
    try { raw = storage.getItem(STORAGE_KEY); } catch (e) { return null; }
    if (!raw || typeof raw !== "string") return null;
    var obj;
    try { obj = JSON.parse(raw); } catch (e) { return null; }
    if (!obj || obj.v !== 1) return null;
    var landing = sanitizeLanding(obj.landing || "", { pageHost: pageHost });
    if (!landing) return null;
    var utm = pickUtm(obj.utm);
    var fromLanding = utmFromUrl(landing);
    for (var i = 0; i < UTM_KEYS.length; i++) {
      var key = UTM_KEYS[i];
      if (fromLanding[key]) utm[key] = fromLanding[key];
    }
    return {
      v: 1,
      landing: landing,
      referrer: sanitizeReferrer(obj.referrer || "", pageHost),
      utm: utm
    };
  }

  function writeStorage(storage, record) {
    if (!storage || typeof storage.setItem !== "function") return;
    try { storage.setItem(STORAGE_KEY, JSON.stringify(record)); } catch (e) {}
  }

  function captureAttribution(input) {
    input = input || {};
    var memory = input.memory || {};
    if (memory.current) return memory.current;
    var pageHost = input.pageHost || hostOf(input.href || "");
    var stored = readStorage(input.storage, pageHost);
    if (stored) {
      memory.current = stored;
      writeStorage(input.storage, stored);
      return stored;
    }
    var record = {
      v: 1,
      landing: sanitizeLanding(input.href || "", { pageHost: pageHost }),
      referrer: sanitizeReferrer(input.referrer || "", pageHost),
      utm: utmFromUrl(input.href || "")
    };
    memory.current = record;
    writeStorage(input.storage, record);
    return record;
  }

  function storageOf(win) {
    try { return win.sessionStorage; } catch (e) { return null; }
  }

  function bagOf(win) {
    try {
      if (!win.__nuhgAttrBag) win.__nuhgAttrBag = {};
      return win.__nuhgAttrBag;
    } catch (e) {
      return {};
    }
  }

  function remember(win) {
    win = win || root;
    if (!win || !win.location) return { v: 1, landing: "", referrer: "", utm: {} };
    var referrer = "";
    try { referrer = win.document && win.document.referrer || ""; } catch (e) { referrer = ""; }
    return captureAttribution({
      href: win.location.href,
      referrer: referrer,
      pageHost: win.location.hostname,
      storage: storageOf(win),
      memory: bagOf(win)
    });
  }

  function payload(record) {
    var rec = record || {};
    var out = { referrer: rec.referrer || "" };
    if (rec.landing) out.landing = rec.landing;
    var utm = rec.utm || {};
    for (var i = 0; i < UTM_KEYS.length; i++) {
      if (utm[UTM_KEYS[i]]) out[UTM_KEYS[i]] = utm[UTM_KEYS[i]];
    }
    return out;
  }

  function forForm(win) {
    return payload(remember(win || root));
  }

  function formatSourceLine(input) {
    var attr = sanitizeAttribution(input);
    var utm = attr.utm || {};
    var campaign = [utm.utm_source, utm.utm_medium, utm.utm_campaign].filter(Boolean);
    var bits = [];
    if (campaign.length) bits.push("campaign " + campaign.join(" / "));
    else if (attr.referrer) bits.push("referrer " + attr.referrer);
    else if (attr.landing) bits.push("direct");
    else bits.push("unavailable");
    if (attr.landing) bits.push("first page " + attr.landing);
    if (attr.referrer && campaign.length) bits.push("referrer " + attr.referrer);
    if (utm.utm_term) bits.push("term " + utm.utm_term);
    if (utm.utm_content) bits.push("content " + utm.utm_content);
    if (utm.utm_id) bits.push("id " + utm.utm_id);
    var line = "Original source: " + bits.join(" | ");
    if (line.length > SOURCE_MAX) line = line.slice(0, SOURCE_MAX).trim();
    return line;
  }

  function mergeDetails(details, sourceLine) {
    var base = details == null ? "" : String(details).replace(/\u0000/g, "");
    var line = sourceLine ? String(sourceLine) : "";
    if (line.length > SOURCE_MAX) line = line.slice(0, SOURCE_MAX);
    if (!line) return clip(base, DETAILS_MAX);
    var extra = (base ? "\n" : "") + line;
    if (base.length + extra.length <= DETAILS_MAX) return base + extra;
    var room = DETAILS_MAX - extra.length;
    if (room <= 0) return clip(line, DETAILS_MAX);
    return base.slice(0, room) + extra;
  }

  function sheetDetails(details, sourceLine) {
    var text = mergeDetails(details, sourceLine);
    if (text.length > DETAILS_MAX) text = text.slice(0, DETAILS_MAX);
    if (/^[=+\-@\t\r]/.test(text)) {
      text = "'" + text;
      if (text.length > DETAILS_MAX) text = text.slice(0, DETAILS_MAX);
    }
    return text;
  }

  function retentionDecision(route, body, existingDetails) {
    var record = body && typeof body === "object" ? body : {};
    var attr = sanitizeAttribution(record.attribution);
    var page = submitPage(typeof record.page === "string" ? record.page : "");
    var consent = record.consent === true;
    if (route === "/api/guide" && !consent) {
      return {
        accepted: true,
        retained: false,
        notifyChristina: false,
        sheet: null,
        sourceLine: "",
        page: page
      };
    }
    if (route !== "/api/guide" && route !== "/api/value" && route !== "/api/signup") {
      return { accepted: false, retained: false, notifyChristina: false, sheet: null, sourceLine: "", page: page };
    }
    var sourceLine = formatSourceLine(attr);
    return {
      accepted: true,
      retained: true,
      notifyChristina: true,
      sourceLine: sourceLine,
      page: page,
      sheet: {
        details: sheetDetails(existingDetails == null ? "" : existingDetails, sourceLine),
        page: page
      }
    };
  }

  function acceptedBody(decision) {
    return { ok: true, accepted: true, retained: !!(decision && decision.retained) };
  }

  function silentDropBody() { return { ok: true }; }

  function repeatBody() { return { ok: true, repeat: true }; }

  function leadAccepted(response) {
    if (!response || typeof response !== "object") return false;
    if (response.ok !== true) return false;
    if (response.accepted !== true) return false;
    if (response.repeat === true) return false;
    return true;
  }

  function leadParams(formName, followUp, response) {
    if (!FORMS[formName]) return null;
    var follow = followUp ? "yes" : "no";
    var leadType = "retained";
    var guide = formName === "town_guide" || formName === "town_comparison";
    if (guide && !followUp) leadType = "guide_email";
    if (guide && response && response.retained === false) {
      leadType = "guide_email";
      follow = "no";
    }
    return { form_name: formName, follow_up: follow, lead_type: leadType };
  }

  function isInternal(win) {
    try { return !!(win && win.localStorage && win.localStorage.getItem("nuhg_internal")); }
    catch (e) { return false; }
  }

  function trackAccepted(win, formName, meta, response, done) {
    win = win || root;
    meta = meta || {};
    var finished = false;
    var timer = null;
    function finish() {
      if (finished) return;
      finished = true;
      if (timer) clearTimeout(timer);
      if (typeof done === "function") {
        try { done(); } catch (e) {}
      }
    }
    try {
      var honeypot = meta.honeypot == null ? "" : String(meta.honeypot).trim();
      if (honeypot || !leadAccepted(response) || isInternal(win)) { finish(); return; }
      var params = leadParams(formName, !!meta.followUp, response);
      var gtag = win && win.gtag;
      if (!params || typeof gtag !== "function") { finish(); return; }
      timer = setTimeout(finish, 400);
      gtag("event", "generate_lead", {
        form_name: params.form_name,
        follow_up: params.follow_up,
        lead_type: params.lead_type,
        transport_type: "beacon",
        event_callback: function () { finish(); }
      });
    } catch (e) {
      finish();
    }
  }

  var api = {
    STORAGE_KEY: STORAGE_KEY,
    UTM_KEYS: UTM_KEYS,
    DETAILS_MAX: DETAILS_MAX,
    cleanToken: cleanToken,
    sanitizeLanding: sanitizeLanding,
    sanitizeReferrer: sanitizeReferrer,
    sanitizeAttribution: sanitizeAttribution,
    submitPage: submitPage,
    captureAttribution: captureAttribution,
    remember: remember,
    forForm: forForm,
    payload: payload,
    formatSourceLine: formatSourceLine,
    mergeDetails: mergeDetails,
    sheetDetails: sheetDetails,
    retentionDecision: retentionDecision,
    acceptedBody: acceptedBody,
    silentDropBody: silentDropBody,
    repeatBody: repeatBody,
    leadAccepted: leadAccepted,
    leadParams: leadParams,
    trackAccepted: trackAccepted
  };

  if (typeof module !== "undefined" && module.exports && typeof window === "undefined") module.exports = api;
  if (typeof window !== "undefined") {
    window.NUHG = api;
    try { remember(window); } catch (e) {}
  }
})(typeof window !== "undefined" ? window : globalThis);
