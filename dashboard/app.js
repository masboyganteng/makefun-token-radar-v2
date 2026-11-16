// app.js — Token Launch Radar dashboard.
// Renders the board from window.TOKEN_RADAR_DATA (written by main.ts),
// with sorting, filtering, a detail view per protocol, a live-token
// comparison view and an excluded view. No network: all data is local.

(function () {
  var DATA = window.TOKEN_RADAR_DATA || { meta: {}, rows: [], live_top: [], excluded: [] };
  var rows = DATA.rows || [];
  var meta = DATA.meta || {};
  var floor = meta.floor_usd || 50000000;

  function $(id) { return document.getElementById(id); }
  function money(n) {
    if (n === null || n === undefined) return "—";
    if (n >= 1e9) return "$" + (n / 1e9).toFixed(2) + "B";
    if (n >= 1e6) return "$" + (n / 1e6).toFixed(1) + "M";
    if (n >= 1e3) return "$" + (n / 1e3).toFixed(1) + "K";
    return "$" + n;
  }
  function moneyFull(n) {
    if (n === null || n === undefined) return "—";
    return "$" + Math.round(n).toLocaleString("en-US");
  }
  function pct(x) {
    // change_7d arrives in per-cent units (5.645 means +5.645%): show it as is.
    if (x === null || x === undefined) return "—";
    var v = x.toFixed(1);
    return (x >= 0 ? "+" : "") + v + "%";
  }
  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  // ---- meta line ----
  var preCount = rows.filter(function (r) { return r.token_status === "pre"; }).length;
  $("meta").innerHTML =
    "Snapshot <b>" + esc(meta.as_of || "") + "</b> · floor <b>" + money(floor) + "</b>\n" +
    "<b>" + rows.length + "</b> rows · <b>" + preCount + "</b> pre-token · " +
    "<b>" + (rows.length - preCount) + "</b> already-trading comparisons";

  // ---- dropdowns ----
  var cats = {}, chains = {};
  rows.forEach(function (r) {
    cats[r.category] = true;
    r.chains.forEach(function (c) { chains[c] = true; });
  });
  Object.keys(cats).sort().forEach(function (c) {
    var o = document.createElement("option"); o.value = c; o.textContent = c;
    $("cat").appendChild(o);
  });
  Object.keys(chains).sort().forEach(function (c) {
    var o = document.createElement("option"); o.value = c; o.textContent = c;
    $("chain").appendChild(o);
  });

  // ---- board state ----
  var state = { sortKey: "rank", sortDir: 1, q: "", cat: "", chain: "", watchOnly: false, earlyOnly: false, tvlMin: 0 };

  function filtered() {
    var q = state.q.toLowerCase();
    return rows.filter(function (r) {
      if (q && (r.name.toLowerCase().indexOf(q) < 0 && r.slug.toLowerCase().indexOf(q) < 0)) return false;
      if (state.cat && r.category !== state.cat) return false;
      if (state.chain && r.chains.indexOf(state.chain) < 0) return false;
      if (state.watchOnly && !r.watchlist) return false;
      if (state.earlyOnly && !(r.token_status === "pre" && r.tvl_usd < floor)) return false;
      if (r.tvl_usd < state.tvlMin) return false;
      return true;
    });
  }

  function sortRows(list) {
    var k = state.sortKey, d = state.sortDir;
    return list.slice().sort(function (a, b) {
      var av = a[k], bv = b[k];
      if (av === null || av === undefined) av = -Infinity;
      if (bv === null || bv === undefined) bv = -Infinity;
      if (typeof av === "string") return av.localeCompare(bv) * d;
      return (av - bv) * d;
    });
  }

  function badge(r) {
    if (r.token_status === "trading") return '<span class="badge trading">token trades</span>';
    return '<span class="badge pre">records no token</span>';
  }

  function renderBoard() {
    var list = sortRows(filtered());
    $("count").textContent = list.length + " of " + rows.length + " rows shown";
    var html = "";
    list.forEach(function (r) {
      var chg = r.change_7d === null ? "—" : '<span class="' + (r.change_7d >= 0 ? "pos" : "neg") + '">' + pct(r.change_7d) + "</span>";
      html += '<tr data-slug="' + esc(r.slug) + '"' + (r.rank === 1 ? ' class="rank1"' : "") + ">" +
        "<td>" + (r.rank === 1 ? "★ " : "") + r.rank + "</td>" +
        "<td><b>" + esc(r.name) + "</b><br><span style='color:var(--faint);font-size:12px'>" + esc(r.slug) + "</span></td>" +
        "<td>" + esc(r.category) + "</td>" +
        "<td>" + esc(r.chains.slice(0, 2).join(", ")) + (r.chains.length > 2 ? " +" + (r.chains.length - 2) : "") + "</td>" +
        '<td class="num">' + money(r.tvl_usd) + "</td>" +
        "<td>" + chg + "</td>" +
        "<td>" + r.age_days + "d</td>" +
        '<td class="num"><b>' + money(r.implied_value_usd) + "</b></td>" +
        '<td class="num">' + r.multiple.toFixed(3) + "</td>" +
        "<td>" + badge(r) + "</td></tr>";
    });
    $("rows").innerHTML = html || '<tr><td colspan="10">No rows match the filters.</td></tr>';
  }

  // ---- detail view ----
  var selected = null;
  function showDetail(slug) {
    var r = null;
    rows.forEach(function (x) { if (x.slug === slug) r = x; });
    var box = $("detail");
    if (!r) { box.classList.add("hidden"); selected = null; return; }
    selected = slug;
    document.querySelectorAll("#rows tr").forEach(function (tr) {
      tr.classList.toggle("sel", tr.getAttribute("data-slug") === slug);
    });
    var steps = r.farm_steps.map(function (s, i) {
      return "<li><b>Step " + (i + 1) + ".</b> " + esc(s) + "</li>";
    }).join("");
    box.innerHTML =
      "<h2>#" + r.rank + " — " + esc(r.name) + " " + badge(r) + (r.watchlist ? ' <span class="badge watch">watchlist</span>' : "") + "</h2>" +
      '<p class="sub2">' + esc(r.slug) + " · " + esc(r.category) + " · " + esc(r.chains.join(", ")) +
      " · snapshot " + esc(meta.as_of || "") + "</p>" +
      '<div class="kv">' +
      "<div><b>" + moneyFull(r.implied_value_usd) + "</b><span>implied value</span></div>" +
      "<div><b>" + moneyFull(r.tvl_usd) + "</b><span>TVL</span></div>" +
      "<div><b>" + pct(r.change_7d) + "</b><span>7-day TVL change</span></div>" +
      "<div><b>" + r.age_days + " days</b><span>running with no token on record</span></div>" +
      "<div><b>" + (r.mcap_usd === null ? "—" : moneyFull(r.mcap_usd)) + "</b><span>market cap (null = records no token)</span></div>" +
      "</div>" +
      "<h3>Model breakdown — every component</h3>" +
      '<table class="components"><tbody>' +
      "<tr><td>Category multiple (" + esc(r.category) + ", " + r.comps_used + " live-token comps" +
      (r.multiple_from_global ? ", global median — fewer than 5 comps" : "") + ")</td><td class='num'>" + r.multiple.toFixed(4) + "</td></tr>" +
      "<tr><td>Growth factor (7d " + pct(r.change_7d) + ", clamped −60% … +120%)</td><td class='num'>× " + r.growth_factor.toFixed(3) + "</td></tr>" +
      "<tr><td>Momentum tilt vs category median growth</td><td class='num'>× " + r.momentum_factor.toFixed(3) + "</td></tr>" +
      "<tr><td>Maturity factor (" + r.age_days + " days, capped at 1,095)</td><td class='num'>× " + r.maturity_factor.toFixed(3) + "</td></tr>" +
      "<tr><td>Chain factor (" + r.chains.length + " chain" + (r.chains.length === 1 ? "" : "s") + ", capped)</td><td class='num'>× " + r.chain_factor.toFixed(3) + "</td></tr>" +
      "<tr><td><b>Implied value = TVL × multiple × growth × momentum × maturity × chains</b></td><td class='num'><b>" + moneyFull(r.implied_value_usd) + "</b></td></tr>" +
      "</tbody></table>" +
      (r.note ? '<div class="note">' + esc(r.note) + "</div>" : "") +
      "<h3>Farm plan — " + r.farm_steps.length + " steps</h3>" +
      '<ol class="steps">' + steps + "</ol>" +
      '<p class="fine">This plan is a suggestion, not a promise: nothing here guarantees a token launch or an airdrop. ' +
      "If there is a points or rewards program, the steps above are how to take part in it.</p>";
    box.classList.remove("hidden");
    box.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  // ---- live-token comparison ----
  $("liveRows").innerHTML = (DATA.live_top || []).map(function (r) {
    var ratio = r.mcap_usd !== null && r.tvl_usd > 0 ? (r.mcap_usd / r.tvl_usd).toFixed(2) : "—";
    return "<tr><td><b>" + esc(r.name) + "</b></td><td>" + esc(r.category) + "</td>" +
      '<td class="num">' + money(r.tvl_usd) + "</td>" +
      '<td class="num"><b>' + money(r.mcap_usd) + "</b></td>" +
      '<td class="num">' + ratio + "</td>" +
      "<td>" + pct(r.change_7d) + "</td></tr>";
  }).join("");

  // ---- excluded ----
  $("exRows").innerHTML = (DATA.excluded || []).map(function (r) {
    return "<tr><td><b>" + esc(r.name) + "</b></td><td>" + esc(r.category) + "</td>" +
      '<td class="num">' + money(r.tvlUsd) + "</td><td>" + esc(r.reason) + "</td></tr>";
  }).join("");
  $("exCount").textContent = "Showing " + (DATA.excluded || []).length + " of " + (DATA.excluded_total || 0) + " excluded protocols (largest by TVL first).";

  // ---- tabs ----
  function showView(name) {
    document.querySelectorAll(".view").forEach(function (v) { v.classList.add("hidden"); });
    var el = $("view-" + name);
    if (el) el.classList.remove("hidden");
    document.querySelectorAll("#tabs button").forEach(function (b) {
      b.classList.toggle("on", b.getAttribute("data-view") === name);
    });
  }
  document.querySelectorAll("#tabs button").forEach(function (b) {
    b.addEventListener("click", function () { showView(b.getAttribute("data-view")); });
  });

  // ---- controls ----
  $("q").addEventListener("input", function (e) { state.q = e.target.value; renderBoard(); });
  $("cat").addEventListener("change", function (e) { state.cat = e.target.value; renderBoard(); });
  $("chain").addEventListener("change", function (e) { state.chain = e.target.value; renderBoard(); });
  $("watchOnly").addEventListener("change", function (e) { state.watchOnly = e.target.checked; renderBoard(); });
  $("earlyOnly").addEventListener("change", function (e) { state.earlyOnly = e.target.checked; renderBoard(); });
  $("tvlMin").addEventListener("input", function (e) {
    state.tvlMin = Number(e.target.value);
    $("tvlLabel").textContent = money(state.tvlMin).replace("$", "");
    renderBoard();
  });
  document.querySelectorAll("#board th[data-sort]").forEach(function (th) {
    th.addEventListener("click", function () {
      var k = th.getAttribute("data-sort");
      if (state.sortKey === k) state.sortDir = -state.sortDir;
      else { state.sortKey = k; state.sortDir = k === "name" || k === "category" || k === "chains" ? 1 : -1; }
      renderBoard();
    });
  });
  $("rows").addEventListener("click", function (e) {
    var tr = e.target.closest("tr[data-slug]");
    if (tr) showDetail(tr.getAttribute("data-slug"));
  });

  // ---- screenshot modes (URL params, deterministic views) ----
  var params = new URLSearchParams(window.location.search);
  var mode = params.get("view") || "board";
  if (params.get("category")) { state.cat = params.get("category"); $("cat").value = state.cat; }
  if (params.get("chain")) { state.chain = params.get("chain"); $("chain").value = state.chain; }
  if (params.get("watchlist") === "1") { state.watchOnly = true; $("watchOnly").checked = true; }
  if (params.get("early") === "1") { state.earlyOnly = true; $("earlyOnly").checked = true; }
  if (mode === "detail" && params.get("slug")) {
    showView("board");
    renderBoard();
    showDetail(params.get("slug"));
  } else if (mode === "filtered") {
    showView("board");
    renderBoard();
  } else if (mode === "live" || mode === "excluded" || mode === "method") {
    showView(mode);
    renderBoard();
  } else {
    renderBoard();
  }
})();
