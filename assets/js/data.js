/* =========================================================================
 * 小a工作台  —  数据层
 * 说明：本文件为「展示用」静态数据。模块元数据来自 erp_modules 拆分包的
 *       README / routes / db；mock 业务数据为演示用途，不含真实业务数据。
 * ========================================================================= */
(function () {
  "use strict";

  /* ----------------------------- 模块元数据 ----------------------------- */

  const MODULES = [
    {
      id: "orders",
      code: "04",
      name: "订单汇总",
      en: "Orders",
      icon: "📦",
      accent: "#4f46e5",
      desc: "订单的录入、列表筛选、行内编辑、批量更新与导出。23 个核心字段 + custom_data 自定义字段，联动销账与结余池。",
      tables: ["orders", "payments", "custom_fields", "users"],
      sourceRef: "app.py L1767-2160 / L3645-4422 / L7388-7976；database.py L949-2263",
      coreFields: [
        { key: "order_date", label: "接单日期", type: "date" },
        { key: "place_order_date", label: "下单日期", type: "date" },
        { key: "merchandiser", label: "跟单员", type: "text" },
        { key: "order_status", label: "订单状态", type: "text" },
        { key: "supplier", label: "供应商", type: "text" },
        { key: "shop_name", label: "店铺名称", type: "text" },
        { key: "product_name", label: "商品名称", type: "text" },
        { key: "brand", label: "品牌", type: "text" },
        { key: "quantity", label: "数量", type: "number" },
        { key: "unit_price", label: "单价", type: "number" },
        { key: "total_amount", label: "总额", type: "number" },
        { key: "customer_name", label: "姓名", type: "text" },
        { key: "phone", label: "电话", type: "text" },
        { key: "address", label: "地址", type: "text" },
        { key: "remote_shipping_fee", label: "偏远运费", type: "number" },
        { key: "order_placement_status", label: "下单状态", type: "text" },
        { key: "notes", label: "备注", type: "text" },
        { key: "express_name", label: "快递名称", type: "text" },
        { key: "express_tracking_no", label: "快递单号", type: "text" },
        { key: "source_channel_notes", label: "来源渠道备注", type: "text" },
        { key: "return_order_status", label: "返单状态", type: "text" },
        { key: "payment_status", label: "收款状态", type: "text" },
        { key: "salesperson", label: "业务员", type: "text" }
      ],
      systemFields: [
        { key: "paid_amount", label: "已收金额", type: "number" },
        { key: "remaining_amount", label: "剩余金额", type: "number" },
        { key: "reconciliation_status", label: "销账状态", type: "tag", options: ["unpaid", "partial", "paid", "overdrawn"] },
        { key: "reconciliation_date", label: "销账日期", type: "date" },
        { key: "prepayment_customer_id", label: "预付款客户", type: "text" },
        { key: "custom_data", label: "自定义字段", type: "json" },
        { key: "cost_total", label: "总成本", type: "number" },
        { key: "abnormal_status", label: "异常状态", type: "tag", options: ["normal", "abnormal"] },
        { key: "abnormal_reason", label: "异常原因", type: "text" },
        { key: "balance_used_amount", label: "结余池已用", type: "number" },
        { key: "supplier_payment_status", label: "供应商付款状态", type: "text" }
      ],
      routes: [
        { path: "/orders", method: "GET", perm: "orders_view", desc: "订单列表（多列筛选 + 分页）" },
        { path: "/orders/create", method: "GET/POST", perm: "orders_edit", desc: "新建订单" },
        { path: "/orders/<id>/edit", method: "GET/POST", perm: "orders_edit", desc: "编辑订单" },
        { path: "/orders/<id>/delete", method: "POST", perm: "admin", desc: "删除订单" },
        { path: "/orders/batch-delete", method: "POST", perm: "admin", desc: "批量删除" },
        { path: "/orders/export", method: "GET/POST", perm: "orders_view", desc: "导出订单（流式）" },
        { path: "/orders/export-template", method: "GET", perm: "orders_view", desc: "空白导入模板" },
        { path: "/orders/export-columns", method: "GET", perm: "orders_view", desc: "可导出列清单" },
        { path: "/orders/export-fields", method: "GET", perm: "orders_view", desc: "导出字段分组" },
        { path: "/orders/export-templates", method: "GET", perm: "orders_view", desc: "已保存导出模板列表" },
        { path: "/orders/export-template/upload", method: "POST", perm: "orders_view", desc: "上传导出模板" },
        { path: "/orders/export-template/<id>", method: "DELETE/GET", perm: "orders_view", desc: "删除/读取导出模板" },
        { path: "/orders/export-template/<id>/mapping", method: "PUT", perm: "orders_view", desc: "更新字段映射" },
        { path: "/api/orders/all-ids", method: "POST", perm: "orders_view", desc: "全选所有页面的 ID 与统计" },
        { path: "/api/orders/filter-values", method: "GET", perm: "orders_view", desc: "筛选列去重值与计数" },
        { path: "/api/orders/find-page", method: "GET", perm: "orders_view", desc: "查找订单所在页码" },
        { path: "/api/orders/batch-update", method: "POST", perm: "order_batch_update", desc: "批量更新订单字段" },
        { path: "/api/orders/<id>/quick-update", method: "POST", perm: "orders_edit", desc: "行内快速更新" },
        { path: "/api/orders/match-products", method: "GET", perm: "orders_view", desc: "商品/品牌模糊匹配" },
        { path: "/api/user/column-config", method: "GET/POST", perm: "login", desc: "列配置保存/读取" }
      ]
    },
    {
      id: "reconciliation",
      code: "07",
      name: "销账系统",
      en: "Reconciliation",
      icon: "💸",
      accent: "#0ea5e9",
      desc: "按店铺汇总销账情况，管理收款记录。销账状态机驱动 paid/remaining/status，支持一键结清、批量撤销与脏数据修复。",
      tables: ["orders", "payments", "payment_custom_fields"],
      sourceRef: "app.py L4425-4939；database.py L2266-2751",
      statusMachine: [
        { state: "unpaid", cond: "paid_amount = 0", paid: "0", remaining: "= 总额" },
        { state: "partial", cond: "0 < paid < 总额", paid: "paid_amount", remaining: "总额 − paid" },
        { state: "paid", cond: "paid ≥ 总额", paid: "= 总额", remaining: "0" },
        { state: "overdrawn", cond: "余额池超支记账（结余池写入）", paid: "—", remaining: "—" }
      ],
      routes: [
        { path: "/reconciliation", method: "GET", perm: "reconciliation", desc: "按店铺汇总销账情况" },
        { path: "/reconciliation/shop/<shop>", method: "GET", perm: "reconciliation", desc: "某店铺的订单列表" },
        { path: "/reconciliation/<order_id>", method: "GET/POST", perm: "reconciliation", desc: "订单销账详情 + 添加收款" },
        { path: "/reconciliation/<order_id>/quick-pay", method: "POST", perm: "reconciliation_quick_pay", desc: "一键结清" },
        { path: "/reconciliation/<order_id>/reconciliation-status", method: "POST", perm: "reconciliation_status_edit", desc: "手动修改销账状态" },
        { path: "/payments/<payment_id>/delete", method: "POST", perm: "admin", desc: "删除单条收款" },
        { path: "/payment-records", method: "GET", perm: "reconciliation", desc: "收款记录列表" },
        { path: "/api/orders/<id>/reconciliation-status", method: "POST", perm: "reconciliation", desc: "行内修改销账状态" },
        { path: "/api/orders/<id>/quick-pay", method: "POST", perm: "reconciliation", desc: "行内一键销账（AJAX）" },
        { path: "/api/orders/<id>/paid-amount", method: "POST", perm: "reconciliation", desc: "行内修改已收金额" },
        { path: "/api/orders/<id>/abnormal", method: "POST", perm: "orders_edit", desc: "行内修改异常状态" },
        { path: "/api/orders/batch-quick-pay", method: "POST", perm: "reconciliation", desc: "批量一键销账" },
        { path: "/api/payments/batch-undo", method: "POST", perm: "reconciliation_status_edit", desc: "批量撤销收款（3 种入口）" },
        { path: "/api/admin/fix-dirty-recon", method: "POST", perm: "admin", desc: "手动修复脏销账" },
        { path: "/api/admin/reset-orphan-recon", method: "POST", perm: "admin", desc: "清理孤儿已结清订单" }
      ]
    },
    {
      id: "balance_pool",
      code: "08",
      name: "店铺结余池",
      en: "Balance Pool",
      icon: "🏊",
      accent: "#10b981",
      desc: "按店铺管理预存结余池，支持抵扣订单、收款/调整/退款联动，以及超支记账模式（available 可为负）。",
      tables: ["balance_pool", "balance_deductions", "balance_pool_topups", "payments", "orders"],
      sourceRef: "app.py L4942-5610；database.py L5019-6380",
      statusMachine: [
        { state: "active", cond: "available > 0", avail: "正数（结余）" },
        { state: "exhausted", cond: "available = 0", avail: "0（已用完）" },
        { state: "insufficient", cond: "available < 0", avail: "负数（超支记账）" },
        { state: "closed", cond: "用户手动关闭", avail: "—" }
      ],
      topupTypes: [
        { type: "income", label: "收款（正向充值）", dir: "必须 > 0" },
        { type: "adjustment", label: "手动调整", dir: "可正可负" },
        { type: "refund", label: "退款联动（系统自动）", dir: "必须 > 0" }
      ],
      routes: [
        { path: "/balance-pool", method: "GET", perm: "balance_pool", desc: "结余池列表" },
        { path: "/balance-pool/export", method: "GET", perm: "balance_pool", desc: "导出结余池列表" },
        { path: "/balance-pool/<id>/export-deductions", method: "GET", perm: "balance_pool", desc: "按批次导出抵扣明细" },
        { path: "/balance-pool/create", method: "GET/POST", perm: "balance_pool_edit", desc: "创建结余池" },
        { path: "/balance-pool/<id>", method: "GET", perm: "balance_pool", desc: "结余池详情（批次汇总 + 待抵扣订单）" },
        { path: "/balance-pool/<id>/edit", method: "GET/POST", perm: "balance_pool_edit", desc: "编辑结余池" },
        { path: "/balance-pool/<id>/delete", method: "POST", perm: "balance_pool_edit", desc: "删除结余池（二次确认）" },
        { path: "/api/balance-pool/<id>/deduct", method: "POST", perm: "balance_pool_deduct", desc: "用结余池抵扣多个订单" },
        { path: "/api/balance-pool/<id>/auto-deduct", method: "POST", perm: "balance_pool_deduct", desc: "一键自动抵扣" },
        { path: "/api/balance-pool/<id>/deduct-selected", method: "POST", perm: "balance_pool_deduct", desc: "勾选订单抵扣" },
        { path: "/api/balance-pool/shop/<shop>/available", method: "GET", perm: "balance_pool", desc: "查询店铺可用余额" },
        { path: "/api/balance-pool/<id>/topup", method: "POST", perm: "balance_pool_edit", desc: "收款（正向充值）" },
        { path: "/api/balance-pool/<id>/adjust", method: "POST", perm: "balance_pool_edit", desc: "调整金额" },
        { path: "/api/balance-pool/topup/<id>/edit", method: "POST", perm: "balance_pool_edit", desc: "编辑 topup 记录" },
        { path: "/api/balance-pool/topup/<id>/delete", method: "POST", perm: "balance_pool_edit", desc: "删除 topup 记录" },
        { path: "/api/balance-pool/deduction/<id>/edit", method: "POST", perm: "balance_pool_deduct", desc: "调整抵扣金额" },
        { path: "/api/balance-pool/deduction/<id>/delete", method: "POST", perm: "balance_pool_deduct", desc: "删除抵扣明细" },
        { path: "/api/balance-pool/deductions/batch-delete", method: "POST", perm: "balance_pool_deduct", desc: "批量删除抵扣明细" }
      ]
    }
  ];

  /* ------------------------------ mock 数据 ------------------------------ */
  // 固定数组，确定性生成，刷新不变。

  const SHOPS = [
    "小a旗舰店", "小a服饰专营", "小a家居", "小a美妆",
    "小a数码", "小a食品", "小a母婴", "小a户外"
  ];
  const MERCHANDISERS = ["张敏", "李伟", "王芳", "陈静", "刘洋"];
  const SALES = ["赵磊", "孙倩", "周强", "吴婷"];
  const SUPPLIERS = ["义乌宏达", "广州衣品", "深圳芯科", "杭州茶语", "南通织造"];
  const BRANDS = ["晨光", "简物", "北纬30°", "云栖"];
  const PRODUCTS = [
    "纯棉圆领T恤", "真丝印花围巾", "智能护眼台灯", "316不锈钢保温杯",
    "轻薄羽绒服", "亚麻休闲裤", "陶瓷餐具六件套", "便携蓝牙音箱",
    "婴儿连体哈衣", "冲锋衣三合一", "羊毛混纺针织衫", "香薰加湿器"
  ];
  const ORDER_STATUS = ["待生产", "生产中", "已发货", "已完成", "已取消"];
  const PLACE_STATUS = ["未下单", "已下单", "待确认"];
  const RETURN_STATUS = ["未返", "返单中", "已返"];
  const SUP_PAY = ["未付", "部分付", "已付"];
  const RECON = ["unpaid", "partial", "paid", "overdrawn"];
  const EXPRESS = ["顺丰速运", "中通快递", "圆通速递", "京东物流"];
  const CHANNELS = ["抖音直播间", "视频号小店", "私域社群", "淘宝旗舰", "线下门店"];

  // 简单确定性伪随机（基于索引）
  function pick(arr, i) { return arr[i % arr.length]; }
  function rnd(i, mod) { return (i * 9301 + 49297) % mod; }

  function fmtDate(base, offset) {
    const d = new Date(2026, 8, 1);
    d.setDate(d.getDate() + base + offset);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  // 生成 30 条订单
  const ORDERS = [];
  for (let i = 0; i < 30; i++) {
    const shop = pick(SHOPS, i + rnd(i, 8));
    const total = 280 + rnd(i * 7 + 3, 9200);
    const recon = pick(RECON, i + rnd(i, 4));
    let paid = 0, remaining = total, reconDate = "";
    if (recon === "paid") { paid = total; remaining = 0; reconDate = fmtDate(rnd(i, 20), 5); }
    else if (recon === "partial") { paid = Math.round(total * (0.3 + rnd(i, 50) / 100)); remaining = total - paid; reconDate = fmtDate(rnd(i, 20), 3); }
    else if (recon === "overdrawn") { paid = total; remaining = 0; reconDate = fmtDate(rnd(i, 20), 2); }
    const cost = Math.round(total * (0.55 + rnd(i + 1, 30) / 100));
    const abnormal = cost > total ? "abnormal" : "normal";
    const qty = 1 + rnd(i * 3 + 1, 40);
    const unit = Math.round(total / qty);
    const balanceUsed = recon === "overdrawn" ? Math.round(total * 0.6) : (recon === "paid" && rnd(i, 3) === 0 ? Math.round(total * 0.4) : 0);
    ORDERS.push({
      id: 1000 + i,
      order_date: fmtDate(rnd(i, 20), 0),
      place_order_date: fmtDate(rnd(i, 20), 1),
      merchandiser: pick(MERCHANDISERS, i),
      order_status: pick(ORDER_STATUS, i + rnd(i, 5)),
      supplier: pick(SUPPLIERS, i),
      shop_name: shop,
      product_name: pick(PRODUCTS, i),
      brand: pick(BRANDS, i),
      quantity: qty,
      unit_price: unit,
      total_amount: total,
      customer_name: pick(["林女士", "陈先生", "黄小姐", "王先生", "周女士", "郑先生"], i),
      phone: "138" + String(10000000 + rnd(i * 9 + 5, 89999999)),
      address: pick(["杭州市西湖区文三路", "广州市天河区珠江新城", "深圳市南山区科技园", "上海市浦东新区世纪大道", "成都市武侯区天府大道"], i),
      remote_shipping_fee: rnd(i, 2) === 0 ? 15 + rnd(i, 30) : 0,
      order_placement_status: pick(PLACE_STATUS, i),
      notes: rnd(i, 4) === 0 ? "客户要求尽快发货" : "",
      express_name: pick(EXPRESS, i),
      express_tracking_no: "SF" + (100000000000 + rnd(i * 11 + 2, 899999999999)),
      source_channel_notes: pick(CHANNELS, i),
      return_order_status: pick(RETURN_STATUS, i),
      payment_status: recon === "paid" || recon === "overdrawn" ? "已付" : recon === "partial" ? "部分付" : "未付",
      salesperson: pick(SALES, i),
      // 系统字段
      paid_amount: paid,
      remaining_amount: remaining,
      reconciliation_status: recon,
      reconciliation_date: reconDate,
      prepayment_customer_id: rnd(i, 5) === 0 ? "PRE-" + (200 + i) : "",
      custom_data: rnd(i, 3) === 0 ? { cf_gift: pick(["礼盒装", "无", "贺卡"], i), cf_priority: pick(["普通", "加急"], i) } : {},
      cost_total: cost,
      abnormal_status: abnormal,
      abnormal_reason: abnormal === "abnormal" ? "成本高于总额" : "",
      balance_used_amount: balanceUsed,
      supplier_payment_status: pick(SUP_PAY, i)
    });
  }

  // 收款记录（payments）：为 partial / paid / overdrawn 订单生成
  const METHODS = ["微信", "支付宝", "银行转账", "结余池抵扣"];
  const PAYMENTS = [];
  let pid = 1;
  ORDERS.forEach((o) => {
    if (o.reconciliation_status === "unpaid") return;
    const n = o.reconciliation_status === "partial" ? (1 + (o.id % 2)) : 1;
    let remain = o.paid_amount;
    for (let k = 0; k < n; k++) {
      const isLast = k === n - 1;
      const amt = isLast ? remain : Math.round(remain / (n - k) * (0.4 + (k % 3) * 0.2));
      remain -= amt;
      PAYMENTS.push({
        id: "P" + String(pid++).padStart(4, "0"),
        order_id: o.id,
        shop: o.shop_name,
        method: o.reconciliation_status === "overdrawn" && k === 0 ? "结余池抵扣" : pick(METHODS, o.id + k),
        amount: amt,
        date: fmtDate(parseInt(o.order_date.slice(8)) - 1, 2 + k),
        operator: pick(MERCHANDISERS, o.id)
      });
    }
  });

  // 店铺结余池：每个店铺一个池
  const POOLS = SHOPS.map((shop, i) => {
    const total = 5000 + rnd(i * 5 + 2, 30000);
    const used = rnd(i, 2) === 0
      ? total + rnd(i, 8000)            // 超支
      : Math.round(total * (0.3 + rnd(i, 60) / 100));
    const available = total - used;
    let status = "active";
    if (available < 0) status = "insufficient";
    else if (available === 0) status = "exhausted";
    if (i === SHOPS.length - 1) status = "closed";
    return {
      id: "BP" + String(100 + i),
      shop,
      total,
      used,
      available,
      status,
      created: fmtDate(0, -10 - i),
      note: status === "insufficient" ? "本店累计欠款，超支记账中" : ""
    };
  });

  // 抵扣明细：从 overdrawn / 部分 paid 订单挑一些挂到池
  const DEDUCTIONS = [];
  let did = 1;
  ORDERS.filter((o) => o.balance_used_amount > 0).forEach((o) => {
    const pool = POOLS.find((p) => p.shop === o.shop_name);
    if (!pool) return;
    DEDUCTIONS.push({
      id: "D" + String(did++).padStart(4, "0"),
      pool_id: pool.id,
      order_id: o.id,
      shop: o.shop_name,
      amount: o.balance_used_amount,
      batch: "B" + (1000 + (o.id % 7)),
      date: fmtDate(parseInt(o.order_date.slice(8)), 4),
      remark: o.reconciliation_status === "overdrawn" ? "[超支] 抵扣" : "抵扣"
    });
  });

  // topup 记录
  const TOPUPS = [];
  let tid = 1;
  POOLS.forEach((p, i) => {
    TOPUPS.push({
      id: "T" + String(tid++).padStart(4, "0"),
      pool_id: p.id,
      shop: p.shop,
      type: "income",
      amount: p.total,
      date: p.created,
      operator: pick(MERCHANDISERS, i),
      remark: "初始收款充值"
    });
    if (p.status === "insufficient") {
      TOPUPS.push({
        id: "T" + String(tid++).padStart(4, "0"),
        pool_id: p.id,
        shop: p.shop,
        type: "refund",
        amount: 1500 + rnd(i, 3000),
        date: fmtDate(5, i),
        operator: "系统",
        remark: "退款联动（自动）"
      });
    }
  });

  window.ERP_DATA = {
    meta: {
      project: "小a工作台",
      version: "个人版 v1 · 2026-10-09",
      note: "纯前端个人工作台 · 数据仅存浏览器 · 可部署到 GitHub Pages"
    },
    modules: MODULES,
    mock: { orders: ORDERS, shops: SHOPS, payments: PAYMENTS, pools: POOLS, deductions: DEDUCTIONS, topups: TOPUPS }
  };
})();
