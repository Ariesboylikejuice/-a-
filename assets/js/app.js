/* =========================================================================
 * 小a工作台  —  应用逻辑（纯前端 / 数据仅存浏览器 localStorage）
 * 所有增删改查只写入本浏览器，刷新保留；清除浏览器站点数据即全部丢失。
 * ========================================================================= */
(function () {
  "use strict";
  const D = window.ERP_DATA;
  const M = D.modules;
  const STORE_KEY = "xiao_a_workbench_v1";
  const view = document.getElementById("view");

  /* ----------------------------- 工具函数 ----------------------------- */
  const $ = (s, r = document) => r.querySelector(s);
  function esc(s) {
    if (s === null || s === undefined || s === "") return "";
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  const money = (n) => "¥" + (Number(n) || 0).toLocaleString("zh-CN");
  const num = (n) => (Number(n) || 0).toLocaleString("zh-CN");
  function today() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
  function statusBadge(s) {
    const map = {
      unpaid: ["unpaid", "未收"], partial: ["partial", "部分收"], paid: ["paid", "已收"], overdrawn: ["overdrawn", "超支"],
      active: ["active", "正常"], exhausted: ["exhausted", "已用完"], insufficient: ["insufficient", "超支"], closed: ["closed", "已关闭"],
      normal: ["normal", "正常"], abnormal: ["abnormal", "异常"]
    };
    const m = map[s] || ["gray", esc(s)];
    return `<span class="badge ${m[0]}"><span class="bdot"></span>${m[1]}</span>`;
  }
  const tag = (t) => `<span class="badge gray">${esc(t)}</span>`;

  /* ----------------------------- 本地存储 ----------------------------- */
  let store;
  function seedStore() { return JSON.parse(JSON.stringify(D.mock)); }
  function loadStore() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) { const p = JSON.parse(raw); if (p && p.orders) return p; }
    } catch (e) { /* 存储被禁用时回退内存态 */ }
    return seedStore();
  }
  function saveStore() { try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch (e) {} }
  store = loadStore();

  // 唯一 ID
  function nid(prefix, arr) {
    let max = 0;
    arr.forEach((x) => { const m = String(x.id).match(/\d+/g); if (m) m.forEach((n) => { const v = parseInt(n, 10); if (v > max) max = v; }); });
    return prefix + (max + 1);
  }
  const nextOrderId = () => { let mx = 999; store.orders.forEach((o) => { if (o.id > mx) mx = o.id; }); return mx + 1; };

  /* ----------------------------- 业务计算 ----------------------------- */
  function recomputeOrder(o) {
    const paid = store.payments.filter((p) => p.order_id === o.id).reduce((s, p) => s + p.amount, 0);
    o.paid_amount = paid;
    o.remaining_amount = Math.max(0, o.total_amount - paid);
    o.reconciliation_status = paid <= 0 ? "unpaid" : paid >= o.total_amount ? "paid" : "partial";
    o.payment_status = o.reconciliation_status === "paid" ? "已付" : o.reconciliation_status === "partial" ? "部分付" : "未付";
    if (paid > 0 && !o.reconciliation_date) o.reconciliation_date = today();
  }

  /* ----------------------------- 弹窗 / 提示 ----------------------------- */
  let modalEl = null;
  function closeModal() { if (modalEl) { modalEl.remove(); modalEl = null; } }
  function openModal(title, bodyHtml, onSubmit) {
    closeModal();
    modalEl = document.createElement("div");
    modalEl.className = "modal-backdrop";
    modalEl.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <div class="modal-head"><h3>${esc(title)}</h3><div class="spacer"></div><button class="x" aria-label="关闭">×</button></div>
      <div class="modal-body">${bodyHtml}</div>
      <div class="modal-foot"><button class="btn" data-act="cancel">取消</button><button class="btn primary" data-act="ok">确定</button></div>
    </div>`;
    document.body.appendChild(modalEl);
    $(".x", modalEl).addEventListener("click", closeModal);
    $('[data-act="cancel"]', modalEl).addEventListener("click", closeModal);
    modalEl.addEventListener("click", (e) => { if (e.target === modalEl) closeModal(); });
    $('[data-act="ok"]', modalEl).addEventListener("click", () => { if (onSubmit && onSubmit(modalEl) === false) return; closeModal(); });
    setTimeout(() => { const f = modalEl.querySelector("input,select,textarea"); if (f) f.focus(); }, 30);
  }
  function confirmModal(title, msg, onYes) {
    openModal(title, `<p style="margin:0;color:var(--text-soft)">${msg}</p>`, () => onYes());
  }
  function toast(msg, type) {
    let w = document.getElementById("toastWrap");
    if (!w) { w = document.createElement("div"); w.className = "toast-wrap"; w.id = "toastWrap"; document.body.appendChild(w); }
    const t = document.createElement("div"); t.className = "toast " + (type || ""); t.textContent = msg; w.appendChild(t);
    setTimeout(() => { t.style.opacity = "0"; setTimeout(() => t.remove(), 300); }, 2200);
  }
  function downloadFile(name, content, mime) {
    const blob = new Blob([content], { type: mime || "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /* ----------------------------- 侧边栏 ----------------------------- */
  const NAV = [
    { id: "dashboard", label: "工作台首页", ico: "🏠" },
    { id: "orders", label: "订单汇总", ico: "📦", code: "04" },
    { id: "reconciliation", label: "销账系统", ico: "💸", code: "07" },
    { id: "balance_pool", label: "店铺结余池", ico: "🏊", code: "08" },
    { id: "architecture", label: "架构总览", ico: "🗂️" }
  ];
  function renderSidebar(active) {
    $("#sidebar").innerHTML =
      `<div class="nav-group">导航</div>` +
      NAV.map((n) => `<button class="nav-item ${n.id === active ? "active" : ""}" data-nav="${n.id}">
        <span class="ico">${n.ico}</span><span>${n.label}</span>${n.code ? `<span class="code">${n.code}</span>` : ""}</button>`).join("") +
      `<div class="nav-group">信息</div>
       <div style="padding:10px 12px;color:var(--text-faint);font-size:11.5px;line-height:1.7">${esc(D.meta.version)}<br/>数据仅存本浏览器</div>`;
    $("#sidebar").querySelectorAll("[data-nav]").forEach((b) => b.addEventListener("click", () => { location.hash = "#/" + b.dataset.nav; }));
  }
  const go = (id) => { location.hash = "#/" + id; };

  /* ----------------------------- 首页 ----------------------------- */
  function renderDashboard() {
    const { orders, payments, pools, deductions } = store;
    const totalAmt = orders.reduce((s, o) => s + o.total_amount, 0);
    const paidAmt = orders.reduce((s, o) => s + o.paid_amount, 0);
    const poolTotal = pools.reduce((s, p) => s + p.total, 0);
    const poolUsed = pools.reduce((s, p) => s + p.used, 0);
    const overdrawn = orders.filter((o) => o.reconciliation_status === "overdrawn").length;
    const kpis = [
      { label: "订单总数", value: num(orders.length), delta: "本地数据", cls: "" },
      { label: "订单总金额", value: money(totalAmt), delta: "已收 " + money(paidAmt), cls: "sky" },
      { label: "结余池总额", value: money(poolTotal), delta: "已用 " + money(poolUsed), cls: "emerald" },
      { label: "超支记账订单", value: num(overdrawn), delta: "需关注", cls: "amber", down: true }
    ];
    view.innerHTML = `
      <h1 class="page-title">个人工作台首页</h1>
      <p class="page-sub">${esc(D.meta.project)} · 所有操作仅保存在本浏览器（localStorage）</p>
      <div class="databanner">
        <span>🗂️ <b>本地数据模式</b>：新建/编辑/删除只写进当前浏览器；清掉浏览器站点数据即全部清空。</span>
        <div class="spacer"></div>
        <button class="btn sm" id="resetAll">♻ 清空并重置</button>
      </div>
      <div class="kpi-grid">${kpis.map((k) => `
        <div class="kpi ${k.cls}"><div class="label">${k.label}</div><div class="value">${k.value}</div>
        <div class="delta ${k.down ? "down" : ""}">${k.delta}</div></div>`).join("")}</div>
      <div class="card"><div class="card-head"><h3>🧭 模块导航</h3><div class="sub">点击卡片进入对应模块</div></div>
        <div class="module-grid">${M.map((m) => `
          <div class="module-card" data-go="${m.id}"><div class="m-ico" style="background:${m.accent}">${m.icon}</div>
          <h4>${m.name}</h4><div class="m-en">${m.code} · ${m.en}</div><p>${esc(m.desc)}</p>
          <div class="m-meta"><div><b>${m.tables.length}</b>数据表</div><div><b>${m.routes.length}</b>路由</div><div><b>${m.coreFields ? m.coreFields.length : 0}</b>核心字段</div></div></div>`).join("")}</div>
      </div>
      <div class="card"><div class="card-head"><h3>🔗 三大模块数据流转</h3></div>
        <div class="flow">
          <div class="node"><div class="n-ico">📦</div><h4>订单汇总</h4><p>创建/更新订单 → 联动预付款扣减与结余池抵扣金额</p></div>
          <div class="arrow">→</div>
          <div class="node"><div class="n-ico">💸</div><h4>销账系统</h4><p>添加收款 → 重算 paid/remaining/status → 可触发结余池联动</p></div>
          <div class="arrow">→</div>
          <div class="node"><div class="n-ico">🏊</div><h4>店铺结余池</h4><p>抵扣订单写 deductions+payment，逐笔复评销账状态</p></div>
        </div>
      </div>`;
    view.querySelectorAll("[data-go]").forEach((c) => c.addEventListener("click", () => go(c.dataset.go)));
    $("#resetAll").addEventListener("click", () =>
      confirmModal("清空全部数据", "将删除本浏览器内所有订单/收款/结余池等数据，并恢复初始演示数据。确定继续？", () => {
        store = seedStore(); saveStore(); toast("已重置为初始数据", "ok"); renderCurrent();
      })
    );
  }

  /* ----------------------------- 订单表单 ----------------------------- */
  function orderFormHtml(o) {
    const v = (k) => (o && o[k] != null ? o[k] : "");
    return `<form id="orderForm"><div class="form-grid">
      <div class="field"><label>接单日期</label><input class="input" name="order_date" type="date" value="${o ? esc(o.order_date) : today()}"></div>
      <div class="field"><label>店铺名称</label><input class="input" name="shop_name" value="${esc(v("shop_name"))}" placeholder="如 小a旗舰店"></div>
      <div class="field"><label>商品名称</label><input class="input" name="product_name" value="${esc(v("product_name"))}"></div>
      <div class="field"><label>品牌</label><input class="input" name="brand" value="${esc(v("brand"))}"></div>
      <div class="field"><label>跟单员</label><input class="input" name="merchandiser" value="${esc(v("merchandiser"))}"></div>
      <div class="field"><label>业务员</label><input class="input" name="salesperson" value="${esc(v("salesperson"))}"></div>
      <div class="field"><label>数量</label><input class="input" name="quantity" type="number" min="1" value="${esc(v("quantity") || 1)}"></div>
      <div class="field"><label>单价</label><input class="input" name="unit_price" type="number" min="0" value="${esc(v("unit_price") || 0)}"></div>
      <div class="field"><label>总额</label><input class="input" name="total_amount" type="number" min="0" value="${esc(v("total_amount") || 0)}"></div>
      <div class="field"><label>供应商</label><input class="input" name="supplier" value="${esc(v("supplier"))}"></div>
      <div class="field"><label>订单状态</label><select class="select" name="order_status">
        ${["待生产", "生产中", "已发货", "已完成", "已取消"].map((s) => `<option ${o && o.order_status === s ? "selected" : ""}>${s}</option>`).join("")}</select></div>
      <div class="field"><label>客户姓名</label><input class="input" name="customer_name" value="${esc(v("customer_name"))}"></div>
      <div class="field"><label>电话</label><input class="input" name="phone" value="${esc(v("phone"))}"></div>
      <div class="field full"><label>地址</label><input class="input" name="address" value="${esc(v("address"))}"></div>
    </div></form>`;
  }
  function readOrderForm(modal) {
    const f = $("#orderForm", modal);
    const g = (n) => f.querySelector(`[name="${n}"]`).value.trim();
    const q = Math.max(1, parseInt(g("quantity"), 10) || 1);
    const up = Math.max(0, parseFloat(g("unit_price")) || 0);
    const total = Math.max(0, parseFloat(g("total_amount")) || q * up);
    return {
      order_date: g("order_date") || today(),
      shop_name: g("shop_name"), product_name: g("product_name"), brand: g("brand"),
      merchandiser: g("merchandiser"), salesperson: g("salesperson"),
      quantity: q, unit_price: up, total_amount: total,
      supplier: g("supplier"), order_status: g("order_status"),
      customer_name: g("customer_name"), phone: g("phone"), address: g("address")
    };
  }

  /* ----------------------------- 订单汇总 ----------------------------- */
  const orderState = { shop: "", recon: "", q: "", sort: "id", dir: 1, sel: new Set() };
  function renderOrders() {
    const mod = M.find((m) => m.id === "orders");
    const all = store.orders;
    const shops = [...new Set(all.map((o) => o.shop_name))].filter(Boolean);

    function apply() {
      let rows = all.slice();
      if (orderState.shop) rows = rows.filter((o) => o.shop_name === orderState.shop);
      if (orderState.recon) rows = rows.filter((o) => o.reconciliation_status === orderState.recon);
      if (orderState.q) {
        const q = orderState.q.toLowerCase();
        rows = rows.filter((o) => (o.product_name + o.customer_name + o.shop_name + o.merchandiser + o.express_tracking_no).toLowerCase().includes(q));
      }
      const k = orderState.sort;
      rows.sort((a, b) => {
        let av = a[k], bv = b[k];
        if (typeof av === "string") { av = av || ""; bv = bv || ""; return av.localeCompare(bv, "zh") * orderState.dir; }
        return ((av || 0) - (bv || 0)) * orderState.dir;
      });
      return rows;
    }
    const cols = [
      { k: "id", t: "ID", num: true }, { k: "order_date", t: "接单日期" }, { k: "shop_name", t: "店铺" },
      { k: "product_name", t: "商品" }, { k: "merchandiser", t: "跟单员" }, { k: "quantity", t: "数量", num: true },
      { k: "total_amount", t: "总额", num: true }, { k: "paid_amount", t: "已收", num: true },
      { k: "remaining_amount", t: "剩余", num: true }, { k: "reconciliation_status", t: "销账状态" }, { k: "abnormal_status", t: "异常" }
    ];
    const sel = orderState.sel;

    function draw() {
      const rows = apply();
      const total = rows.reduce((s, o) => s + o.total_amount, 0);
      const remain = rows.reduce((s, o) => s + o.remaining_amount, 0);
      view.innerHTML = `
        <h1 class="page-title">📦 订单汇总</h1>
        <p class="page-sub">${esc(mod.desc)}</p>
        <div class="databanner"><span>🛠️ 可直接<strong>新建 / 编辑 / 删除 / 收款 / 一键结清</strong>订单；所有改动仅存本浏览器。</span></div>
        <div class="toolbar">
          <select class="select" id="f-shop"><option value="">全部店铺</option>${shops.map((s) => `<option ${orderState.shop === s ? "selected" : ""}>${esc(s)}</option>`).join("")}</select>
          <select class="select" id="f-recon"><option value="">全部销账状态</option>${["unpaid", "partial", "paid", "overdrawn"].map((s) => `<option value="${s}" ${orderState.recon === s ? "selected" : ""}>${s}</option>`).join("")}</select>
          <input class="input" id="f-q" placeholder="搜索商品/客户/跟单/单号" value="${esc(orderState.q)}">
          <div class="spacer"></div>
          <span class="muted tabnum">共 ${rows.length} 单 · 总额 ${money(total)} · 未收 ${money(remain)}</span>
          <button class="btn" id="btnExport">⬇ 导出CSV</button>
          <button class="btn" id="btnBatchDel" disabled>🗑 批量删除(<span id="selN">0</span>)</button>
          <button class="btn primary" id="btnNew">＋ 新建订单</button>
        </div>
        <div class="table-wrap"><table class="data">
          <thead><tr>
            <th style="width:34px"><input class="check" id="chkAll" aria-label="全选"></th>
            ${cols.map((c) => `<th class="${c.num ? "num" : ""}" data-sort="${c.k}">${c.t}${orderState.sort === c.k ? (orderState.dir === 1 ? " ▲" : " ▼") : ""}</th>`).join("")}
            <th>操作</th>
          </tr></thead>
          <tbody>
            ${rows.map((o) => `<tr>
              <td><input class="check rowchk" type="checkbox" data-id="${o.id}" ${sel.has(o.id) ? "checked" : ""} aria-label="选择"></td>
              <td class="mono">#${o.id}</td><td>${esc(o.order_date)}</td><td>${esc(o.shop_name)}</td>
              <td>${esc(o.product_name)}</td><td>${esc(o.merchandiser)}</td><td class="num">${num(o.quantity)}</td>
              <td class="num">${money(o.total_amount)}</td><td class="num">${money(o.paid_amount)}</td><td class="num">${money(o.remaining_amount)}</td>
              <td>${statusBadge(o.reconciliation_status)}</td><td>${statusBadge(o.abnormal_status)}</td>
              <td><div class="act-col">
                <button class="btn sm" data-edit="${o.id}">✎</button>
                <button class="btn sm" data-pay="${o.id}">💰</button>
                <button class="btn sm" data-quick="${o.id}">⚡</button>
                <button class="btn sm" data-del="${o.id}">🗑</button>
              </div></td>
            </tr>`).join("")}
            ${rows.length === 0 ? `<tr><td colspan="${cols.length + 2}" class="empty">暂无订单，点击「新建订单」开始</td></tr>` : ""}
          </tbody>
        </table></div>`;

      // 绑定
      $("#f-shop").addEventListener("change", (e) => { orderState.shop = e.target.value; draw(); });
      $("#f-recon").addEventListener("change", (e) => { orderState.recon = e.target.value; draw(); });
      $("#f-q").addEventListener("input", (e) => { orderState.q = e.target.value; draw(); });
      view.querySelectorAll("[data-sort]").forEach((th) => th.addEventListener("click", () => {
        const k = th.dataset.sort; if (orderState.sort === k) orderState.dir *= -1; else { orderState.sort = k; orderState.dir = 1; } draw();
      }));
      $("#btnNew").addEventListener("click", () => openModal("新建订单", orderFormHtml(null), (m) => {
        const d = readOrderForm(m); if (!d.shop_name || !d.product_name) { toast("店铺与商品不能为空", "err"); return false; }
        const o = Object.assign({
          id: nextOrderId(), place_order_date: today(), order_placement_status: "未下单", notes: "", express_name: "",
          express_tracking_no: "", source_channel_notes: "", return_order_status: "未返", prepayment_customer_id: "",
          custom_data: {}, cost_total: Math.round(d.total_amount * 0.6), abnormal_status: "normal", abnormal_reason: "",
          balance_used_amount: 0, supplier_payment_status: "未付", paid_amount: 0, remaining_amount: d.total_amount,
          reconciliation_status: "unpaid", reconciliation_date: "", payment_status: "未付"
        }, d);
        store.orders.push(o); saveStore(); toast("订单已创建", "ok"); renderCurrent();
      }));
      view.querySelectorAll("[data-edit]").forEach((b) => b.addEventListener("click", () => {
        const o = store.orders.find((x) => x.id === Number(b.dataset.edit)); if (!o) return;
        openModal("编辑订单 #" + o.id, orderFormHtml(o), (m) => {
          const d = readOrderForm(m); Object.assign(o, d);
          o.remaining_amount = Math.max(0, o.total_amount - o.paid_amount); recomputeOrder(o); saveStore();
          toast("订单已更新", "ok"); renderCurrent();
        });
      }));
      view.querySelectorAll("[data-pay]").forEach((b) => b.addEventListener("click", () => openPaymentModal(Number(b.dataset.pay))));
      view.querySelectorAll("[data-quick]").forEach((b) => b.addEventListener("click", () => {
        const o = store.orders.find((x) => x.id === Number(b.dataset.quick)); if (!o) return;
        if (o.remaining_amount <= 0) { toast("该订单已结清", "warn"); return; }
        store.payments.push({ id: nid("P", store.payments), order_id: o.id, shop: o.shop_name, method: "银行转账", amount: o.remaining_amount, date: today(), operator: "本机" });
        recomputeOrder(o); saveStore(); toast("已一键结清 #" + o.id, "ok"); renderCurrent();
      }));
      view.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", () => {
        const id = Number(b.dataset.del);
        confirmModal("删除订单", "确定删除订单 #" + id + "？相关收款记录也会一并移除。", () => {
          store.orders = store.orders.filter((o) => o.id !== id);
          store.payments = store.payments.filter((p) => p.order_id !== id);
          store.deductions = store.deductions.filter((dd) => dd.order_id !== id);
          sel.delete(id); saveStore(); toast("已删除 #" + id, "ok"); renderCurrent();
        });
      }));
      const rowchks = view.querySelectorAll(".rowchk");
      rowchks.forEach((c) => c.addEventListener("change", () => { const id = Number(c.dataset.id); if (c.checked) sel.add(id); else sel.delete(id); $("#selN").textContent = sel.size; $("#btnBatchDel").disabled = sel.size === 0; }));
      $("#chkAll").addEventListener("change", (e) => { rowchks.forEach((c) => { c.checked = e.target.checked; const id = Number(c.dataset.id); if (e.target.checked) sel.add(id); else sel.delete(id); }); $("#selN").textContent = sel.size; $("#btnBatchDel").disabled = sel.size === 0; });
      $("#btnBatchDel").addEventListener("click", () => {
        if (sel.size === 0) return;
        confirmModal("批量删除", "确定删除选中的 " + sel.size + " 个订单？", () => {
          const ids = sel; store.orders = store.orders.filter((o) => !ids.has(o.id));
          store.payments = store.payments.filter((p) => !ids.has(p.order_id));
          store.deductions = store.deductions.filter((dd) => !ids.has(dd.order_id));
          sel.clear(); saveStore(); toast("已批量删除", "ok"); renderCurrent();
        });
      });
      $("#btnExport").addEventListener("click", () => exportOrdersCSV(rows));
    }
    draw();
  }

  function exportOrdersCSV(rows) {
    const headers = ["id", "order_date", "shop_name", "product_name", "merchandiser", "quantity", "unit_price", "total_amount", "paid_amount", "remaining_amount", "reconciliation_status", "customer_name", "phone"];
    const cell = (v) => { v = v == null ? "" : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    const csv = [headers.join(",")].concat(rows.map((o) => headers.map((h) => cell(o[h])).join(","))).join("\n");
    downloadFile("orders_" + today() + ".csv", "﻿" + csv, "text/csv;charset=utf-8");
    toast("已导出 " + rows.length + " 条订单", "ok");
  }

  function openPaymentModal(orderId) {
    const o = store.orders.find((x) => x.id === orderId); if (!o) return;
    const body = `<form id="payForm"><div class="form-grid">
      <div class="field full"><label>订单</label><input class="input" value="#${o.id} ${esc(o.shop_name)} · ${esc(o.product_name)}（剩余 ${money(o.remaining_amount)}）" disabled></div>
      <div class="field"><label>收款金额</label><input class="input" name="amount" type="number" min="0" step="0.01" value="${o.remaining_amount}"></div>
      <div class="field"><label>收款方式</label><select class="select" name="method">${["微信", "支付宝", "银行转账", "现金", "结余池抵扣"].map((s) => `<option ${s === "银行转账" ? "selected" : ""}>${s}</option>`).join("")}</select></div>
      <div class="field"><label>收款日期</label><input class="input" name="date" type="date" value="${today()}"></div>
      <div class="field"><label>操作人</label><input class="input" name="operator" value="本机"></div>
    </div></form>`;
    openModal("添加收款 · #" + o.id, body, (m) => {
      const f = $("#payForm", m); const amt = parseFloat(f.querySelector('[name="amount"]').value) || 0;
      if (amt <= 0) { toast("金额需大于 0", "err"); return false; }
      store.payments.push({ id: nid("P", store.payments), order_id: o.id, shop: o.shop_name, method: f.querySelector('[name="method"]').value, amount: amt, date: f.querySelector('[name="date"]').value || today(), operator: f.querySelector('[name="operator"]').value || "本机" });
      recomputeOrder(o); saveStore(); toast("已添加收款 " + money(amt), "ok"); renderCurrent();
    });
  }

  /* ----------------------------- 销账系统 ----------------------------- */
  function renderReconciliation() {
    const mod = M.find((m) => m.id === "reconciliation");
    const { orders, payments, shops } = store;
    const byShop = shops.map((shop) => {
      const list = orders.filter((o) => o.shop_name === shop);
      const total = list.reduce((s, o) => s + o.total_amount, 0);
      const paid = list.reduce((s, o) => s + o.paid_amount, 0);
      const cnt = { unpaid: 0, partial: 0, paid: 0, overdrawn: 0 };
      list.forEach((o) => cnt[o.reconciliation_status]++);
      return { shop, total, paid, remain: total - paid, cnt, n: list.length };
    }).filter((s) => s.n > 0);
    view.innerHTML = `
      <h1 class="page-title">💸 销账系统</h1>
      <p class="page-sub">${esc(mod.desc)}</p>
      <div class="databanner"><span>🛠️ 可在「收款记录」处<strong>添加收款</strong>，系统自动重算订单的已收/剩余/销账状态。</span>
        <div class="spacer"></div><button class="btn sm primary" id="btnAddPay">＋ 添加收款</button></div>
      <div class="card"><div class="card-head"><h3>🏪 按店铺汇总销账</h3></div>
        <div class="table-wrap"><table class="data"><thead><tr><th>店铺</th><th class="num">订单数</th><th class="num">总额</th><th class="num">已收</th><th class="num">剩余</th><th>状态分布</th></tr></thead>
        <tbody>${byShop.map((s) => `<tr><td>${esc(s.shop)}</td><td class="num">${num(s.n)}</td><td class="num">${money(s.total)}</td><td class="num">${money(s.paid)}</td><td class="num">${money(s.remain)}</td>
          <td class="tag-list">${statusBadge("unpaid")} ${s.cnt.unpaid} ${statusBadge("partial")} ${s.cnt.partial} ${statusBadge("paid")} ${s.cnt.paid} ${s.cnt.overdrawn ? statusBadge("overdrawn") + " " + s.cnt.overdrawn : ""}</td></tr>`).join("")}
          ${byShop.length === 0 ? `<tr><td colspan="6" class="empty">暂无数据</td></tr>` : ""}</tbody></table></div>
      </div>
      <div class="grid-2">
        <div class="card"><div class="card-head"><h3>🔄 销账状态机</h3></div>
          <div class="table-wrap"><table class="data"><thead><tr><th>状态</th><th>触发条件</th><th>已收/剩余</th></tr></thead>
          <tbody>${mod.statusMachine.map((r) => `<tr><td>${statusBadge(r.state)}</td><td class="muted">${esc(r.cond)}</td><td class="muted">${esc(r.paid)} / ${esc(r.remaining)}</td></tr>`).join("")}</tbody></table></div>
        </div>
        <div class="card"><div class="card-head"><h3>🧰 演示占位操作</h3></div>
          <div class="tag-list" style="gap:10px"><button class="btn" disabled>⚡ 一键结清(列表)</button><button class="btn" disabled>↩ 批量撤销</button><button class="btn" disabled>🛠 修复脏销账</button></div>
          <p class="muted" style="margin-top:14px;font-size:12.5px">以上为原 routes 占位；实际收款请使用「添加收款」。</p></div>
      </div>
      <div class="card"><div class="card-head"><h3>🧾 收款记录（payments）</h3><div class="sub">共 ${payments.length} 笔</div></div>
        <div class="table-wrap"><table class="data"><thead><tr><th>收款ID</th><th>订单</th><th>店铺</th><th>方式</th><th class="num">金额</th><th>日期</th><th>操作人</th><th></th></tr></thead>
        <tbody>${payments.slice(0, 60).map((p) => `<tr><td class="mono">${esc(p.id)}</td><td class="mono">#${p.order_id}</td><td>${esc(p.shop)}</td><td>${tag(p.method)}</td><td class="num">${money(p.amount)}</td><td>${esc(p.date)}</td><td>${esc(p.operator)}</td>
          <td><button class="btn sm" data-delpay="${p.id}">🗑</button></td></tr>`).join("")}
          ${payments.length > 60 ? `<tr><td colspan="8" class="empty">… 仅显示前 60 笔</td></tr>` : ""}</tbody></table></div>
      </div>`;
    $("#btnAddPay").addEventListener("click", () => {
      const cand = store.orders.filter((o) => o.remaining_amount > 0);
      if (cand.length === 0) { toast("没有待收款订单", "warn"); return; }
      const opts = cand.map((o) => `<option value="${o.id}">#${o.id} ${esc(o.shop_name)} · ${esc(o.product_name)}（剩 ${money(o.remaining_amount)}）</option>`).join("");
      const body = `<form id="payForm2"><div class="form-grid">
        <div class="field full"><label>选择订单</label><select class="select" name="order_id">${opts}</select></div>
        <div class="field"><label>收款金额</label><input class="input" name="amount" type="number" min="0" step="0.01"></div>
        <div class="field"><label>方式</label><select class="select" name="method">${["微信", "支付宝", "银行转账", "现金", "结余池抵扣"].map((s) => `<option ${s === "银行转账" ? "selected" : ""}>${s}</option>`).join("")}</select></div>
        <div class="field"><label>日期</label><input class="input" name="date" type="date" value="${today()}"></div>
        <div class="field"><label>操作人</label><input class="input" name="operator" value="本机"></div>
      </div></form>`;
      openModal("添加收款", body, (m) => {
        const f = $("#payForm2", m); const oid = Number(f.querySelector('[name="order_id"]').value);
        const o = store.orders.find((x) => x.id === oid); const amt = parseFloat(f.querySelector('[name="amount"]').value) || 0;
        if (amt <= 0) { toast("金额需大于 0", "err"); return false; }
        store.payments.push({ id: nid("P", store.payments), order_id: oid, shop: o.shop_name, method: f.querySelector('[name="method"]').value, amount: amt, date: f.querySelector('[name="date"]').value || today(), operator: f.querySelector('[name="operator"]').value || "本机" });
        recomputeOrder(o); saveStore(); toast("已添加收款", "ok"); renderCurrent();
      });
    });
    view.querySelectorAll("[data-delpay]").forEach((b) => b.addEventListener("click", () => {
      const id = b.dataset.delpay;
      confirmModal("删除收款", "确定删除收款 " + id + "？对应订单金额将回滚。", () => {
        const p = store.payments.find((x) => x.id === id); store.payments = store.payments.filter((x) => x.id !== id);
        if (p) { const o = store.orders.find((x) => x.id === p.order_id); if (o) recomputeOrder(o); }
        saveStore(); toast("已删除收款", "ok"); renderCurrent();
      });
    }));
  }

  /* ----------------------------- 店铺结余池 ----------------------------- */
  function renderBalancePool() {
    const mod = M.find((m) => m.id === "balance_pool");
    const { pools, deductions, topups } = store;
    view.innerHTML = `
      <h1 class="page-title">🏊 店铺结余池</h1>
      <p class="page-sub">${esc(mod.desc)}</p>
      <div class="databanner"><span>🛠️ 可<strong>创建结余池 / 收款充值 / 手动调整 / 自动抵扣</strong>；可用余额可为负（超支记账）。</span>
        <div class="spacer"></div><button class="btn sm primary" id="btnNewPool">＋ 新建结余池</button></div>
      <div class="card"><div class="card-head"><h3>🏦 结余池列表</h3><div class="sub">可用 = 总额 − 已用</div></div>
        <div class="table-wrap"><table class="data"><thead><tr><th>池ID</th><th>店铺</th><th class="num">总额</th><th class="num">已用</th><th>可用余额</th><th>状态</th><th>进度</th><th>操作</th></tr></thead>
        <tbody>${pools.map((p) => {
          const pct = Math.min(100, Math.round((p.used / p.total) * 100)); const over = p.available < 0;
          return `<tr><td class="mono">${esc(p.id)}</td><td>${esc(p.shop)}</td><td class="num">${money(p.total)}</td><td class="num">${money(p.used)}</td>
            <td class="num" style="color:${over ? "var(--orange)" : "var(--text)"};font-weight:700">${money(p.available)}</td>
            <td>${statusBadge(p.status)}</td>
            <td><div class="bar ${over ? "over" : ""}"><span style="width:${pct}%"></span></div></td>
            <td><div class="act-col">
              <button class="btn sm" data-topup="${p.id}">💰充值</button>
              <button class="btn sm" data-deduct="${p.id}">⬇抵扣</button>
              <button class="btn sm" data-delpool="${p.id}">🗑</button>
            </div></td></tr>`;
        }).join("")}
        ${pools.length === 0 ? `<tr><td colspan="8" class="empty">暂无结余池</td></tr>` : ""}</tbody></table></div>
      </div>
      <div class="grid-2">
        <div class="card"><div class="card-head"><h3>🔄 结余池状态机</h3></div>
          <div class="table-wrap"><table class="data"><thead><tr><th>状态</th><th>触发条件</th><th>available</th></tr></thead>
          <tbody>${mod.statusMachine.map((r) => `<tr><td>${statusBadge(r.state)}</td><td class="muted">${esc(r.cond)}</td><td class="muted">${esc(r.avail)}</td></tr>`).join("")}</tbody></table></div>
          <div class="section-label" style="margin-top:16px">Topup 类型</div><div class="tag-list">${mod.topupTypes.map((t) => tag(t.label + "（" + t.dir + "）")).join("")}</div>
        </div>
        <div class="card"><div class="card-head"><h3>🧾 抵扣明细（balance_deductions）</h3><div class="sub">${deductions.length} 条</div></div>
          <div class="table-wrap"><table class="data"><thead><tr><th>明细ID</th><th>店铺</th><th>订单</th><th class="num">金额</th><th>批次</th><th>备注</th></tr></thead>
          <tbody>${deductions.map((d) => `<tr><td class="mono">${esc(d.id)}</td><td>${esc(d.shop)}</td><td class="mono">#${d.order_id}</td><td class="num">${money(d.amount)}</td><td class="mono">${esc(d.batch)}</td><td>${d.remark.includes("超支") ? statusBadge("overdrawn") : tag(d.remark)}</td></tr>`).join("")}
          ${deductions.length === 0 ? `<tr><td colspan="6" class="empty">暂无抵扣明细</td></tr>` : ""}</tbody></table></div>
        </div>
      </div>
      <div class="card"><div class="card-head"><h3>💰 收款 / 调整 / 退款记录（topups）</h3><div class="sub">共 ${topups.length} 条</div></div>
        <div class="table-wrap"><table class="data"><thead><tr><th>记录ID</th><th>店铺</th><th>类型</th><th class="num">金额</th><th>日期</th><th>操作人</th></tr></thead>
        <tbody>${topups.map((t) => `<tr><td class="mono">${esc(t.id)}</td><td>${esc(t.shop)}</td>
          <td>${statusBadge(t.type === "income" ? "active" : t.type === "refund" ? "overdrawn" : "insufficient")} ${esc(t.type)}</td>
          <td class="num">${money(t.amount)}</td><td>${esc(t.date)}</td><td>${esc(t.operator)}</td></tr>`).join("")}
          ${topups.length === 0 ? `<tr><td colspan="6" class="empty">暂无记录</td></tr>` : ""}</tbody></table></div>
      </div>`;

    $("#btnNewPool").addEventListener("click", () => {
      const body = `<form id="poolForm"><div class="form-grid">
        <div class="field full"><label>店铺名称</label><input class="input" name="shop" placeholder="如 小a旗舰店"></div>
        <div class="field full"><label>初始总额</label><input class="input" name="total" type="number" min="0" value="10000"></div>
      </div></form>`;
      openModal("新建结余池", body, (m) => {
        const f = $("#poolForm", m); const shop = f.querySelector('[name="shop"]').value.trim(); const total = parseFloat(f.querySelector('[name="total"]').value) || 0;
        if (!shop) { toast("店铺不能为空", "err"); return false; }
        store.pools.push({ id: nid("BP", store.pools), shop, total, used: 0, available: total, status: "active", created: today(), note: "" });
        saveStore(); toast("结余池已创建", "ok"); renderCurrent();
      });
    });
    view.querySelectorAll("[data-topup]").forEach((b) => b.addEventListener("click", () => {
      const p = store.pools.find((x) => x.id === b.dataset.topup); if (!p) return;
      const body = `<form id="topupForm"><div class="form-grid">
        <div class="field"><label>类型</label><select class="select" name="type">${["income", "adjustment", "refund"].map((s) => `<option ${s === "income" ? "selected" : ""}>${s}</option>`).join("")}</select></div>
        <div class="field"><label>金额</label><input class="input" name="amount" type="number" step="0.01" value="1000"></div>
        <div class="field full"><span class="hint">income/refund 为正向充值（增加总额）；adjustment 可正可负。</span></div>
      </div></form>`;
      openModal("收款/调整 · " + p.shop, body, (m) => {
        const f = $("#topupForm", m); const type = f.querySelector('[name="type"]').value; let amt = parseFloat(f.querySelector('[name="amount"]').value) || 0;
        if (amt === 0) { toast("金额不能为 0", "err"); return false; }
        p.total += amt; p.available = p.total - p.used;
        p.status = p.available > 0 ? "active" : p.available < 0 ? "insufficient" : "exhausted";
        store.topups.push({ id: nid("T", store.topups), pool_id: p.id, shop: p.shop, type, amount: Math.abs(amt), date: today(), operator: "本机", remark: type === "adjustment" ? "手动调整" : "收款充值" });
        saveStore(); toast("已" + (type === "adjustment" ? "调整" : "充值") + " " + money(Math.abs(amt)), "ok"); renderCurrent();
      });
    }));
    view.querySelectorAll("[data-deduct]").forEach((b) => b.addEventListener("click", () => {
      const p = store.pools.find((x) => x.id === b.dataset.deduct); if (!p) return;
      if (p.status === "closed") { toast("该池已关闭", "warn"); return; }
      autoDeduct(p);
    }));
    view.querySelectorAll("[data-delpool]").forEach((b) => b.addEventListener("click", () => {
      const id = b.dataset.delpool;
      confirmModal("删除结余池", "确定删除结余池 " + id + "？相关充值/抵扣记录也会移除。", () => {
        store.pools = store.pools.filter((x) => x.id !== id);
        store.topups = store.topups.filter((x) => x.pool_id !== id);
        store.deductions = store.deductions.filter((x) => x.pool_id !== id);
        saveStore(); toast("已删除结余池", "ok"); renderCurrent();
      });
    }));
  }

  function autoDeduct(pool) {
    const cand = store.orders.filter((o) => o.shop_name === pool.shop && o.remaining_amount > 0).sort((a, b) => a.order_date.localeCompare(b.order_date));
    if (cand.length === 0) { toast("该店铺无可抵扣订单", "warn"); return; }
    let avail = pool.available; let changed = 0;
    for (const o of cand) {
      if (avail <= 0) break;
      const amt = Math.min(o.remaining_amount, avail);
      store.payments.push({ id: nid("P", store.payments), order_id: o.id, shop: pool.shop, method: "结余池抵扣", amount: amt, date: today(), operator: "本机" });
      store.deductions.push({ id: nid("D", store.deductions), pool_id: pool.id, order_id: o.id, shop: pool.shop, amount: amt, batch: "B" + String(Date.now()).slice(-5), date: today(), remark: avail - amt < 0 ? "[超支] 抵扣" : "抵扣" });
      pool.used += amt; avail -= amt; o.balance_used_amount = (o.balance_used_amount || 0) + amt;
      recomputeOrder(o); changed++;
    }
    pool.available = pool.total - pool.used;
    pool.status = pool.available > 0 ? "active" : pool.available < 0 ? "insufficient" : "exhausted";
    saveStore(); toast("已抵扣 " + changed + " 笔订单", "ok"); renderCurrent();
  }

  /* ----------------------------- 架构总览 ----------------------------- */
  function renderArchitecture() {
    view.innerHTML = `
      <h1 class="page-title">🗂️ 架构总览</h1>
      <p class="page-sub">模块拆分结构、数据表、路由清单与数据流（源自 erp_modules 拆分包）</p>
      <div class="card"><div class="card-head"><h3>📁 模块文件树</h3></div><div class="tree">
        <div><span class="dir">erp_modules/</span></div>
        <div>&nbsp;&nbsp;<span class="dir">_shared/</span> <span class="cmt"># 共享基础设施层（说明文档，无实际代码）</span></div>
        <div>&nbsp;&nbsp;<span class="dir">04_orders/</span> <span class="file">__init__.py · routes.py · db.py · README.md</span></div>
        <div>&nbsp;&nbsp;<span class="dir">07_reconciliation/</span> <span class="file">__init__.py · routes.py · db.py · README.md</span></div>
        <div>&nbsp;&nbsp;<span class="dir">08_balance_pool/</span> <span class="file">__init__.py · routes.py · db.py · README.md</span></div>
        <div>&nbsp;&nbsp;<span class="file">README.md</span> <span class="cmt"># 总说明</span></div>
      </div></div>
      <div class="card"><div class="card-head"><h3>🔗 模块间复用关系</h3></div><div class="tree">
        <div><span class="cmt"># _build_order_where(filters) — 订单模块定义，被销账模块 batch_quick_pay_by_filters 复用</span></div>
        <div><span class="cmt"># get_shop_available_balance — 订单列表 & 结余池 共用</span></div>
        <div><span class="cmt"># reassess_pool_orders_status — 结余池内部 deduct/topup/sync/update/delete 多函数调用</span></div>
      </div></div>
      ${M.map((m) => `<div class="card"><div class="card-head"><span style="font-size:18px">${m.icon}</span><h3>${m.code} · ${m.name}（${m.en}）</h3><div class="spacer"></div><span class="badge info">${m.tables.length} 表</span><span class="badge gray">${m.routes.length} 路由</span></div>
        <p class="muted" style="font-size:12.5px;margin-top:-6px">${esc(m.sourceRef)}</p>
        ${m.coreFields ? `<div class="section-label">核心字段（${m.coreFields.length}）</div><div class="tag-list">${m.coreFields.map((f) => tag(f.label)).join("")}</div>
          <div class="section-label" style="margin-top:14px">系统字段</div><div class="tag-list">${m.systemFields.map((f) => tag(f.label)).join("")}</div>`
          : `<div class="section-label">状态机 / 规则</div><div class="tag-list">${(m.statusMachine || []).map((r) => tag(r.state)).join("")}</div>`}
        <div class="section-label" style="margin-top:16px">路由清单（${m.routes.length}）</div>
        <div class="table-wrap"><table class="data"><thead><tr><th>路径</th><th>方法</th><th>权限</th><th>说明</th></tr></thead>
        <tbody>${m.routes.map((r) => `<tr><td class="mono">${esc(r.path)}</td><td>${tag(r.method)}</td><td><span class="muted">${esc(r.perm)}</span></td><td>${esc(r.desc)}</td></tr>`).join("")}</tbody></table></div>
      </div>`).join("")}
      <div class="card"><div class="card-head"><h3>🗄️ 数据表清单</h3></div><div class="tree">
        <div><span class="file">orders</span> — 订单主表</div><div><span class="file">payments</span> — 收款记录</div>
        <div><span class="file">balance_pool</span> — 结余池主表</div><div><span class="file">balance_deductions</span> — 抵扣明细表</div>
        <div><span class="file">balance_pool_topups</span> — 充值/调整/退款记录</div><div><span class="file">custom_fields / users / payment_custom_fields</span> — 支撑表</div>
      </div></div>`;
  }

  /* ----------------------------- 路由 ----------------------------- */
  const ROUTES = { dashboard: renderDashboard, orders: renderOrders, reconciliation: renderReconciliation, balance_pool: renderBalancePool, architecture: renderArchitecture };
  let currentView = renderDashboard;
  function renderCurrent() { currentView(); }
  function router() {
    const id = location.hash.replace("#/", "") || "dashboard";
    currentView = ROUTES[id] || renderDashboard;
    renderSidebar(id);
    view.classList.remove("fade-in"); void view.offsetWidth; view.classList.add("fade-in");
    currentView();
    window.scrollTo(0, 0);
  }
  window.addEventListener("hashchange", router);
  if (document.getElementById("modePill")) document.getElementById("modePill").textContent = "数据仅存本浏览器";
  router();
})();
