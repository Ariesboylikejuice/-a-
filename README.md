# 🅰️ 小a工作台

纯前端的**个人工作面板**。把一套 ERP 后端模块（订单汇总 / 销账系统 / 店铺结余池）可视化成一个能在浏览器里直接增删改查的工作台，**所有数据只存在你自己的浏览器本地存储（localStorage）**——刷新不丢，但清掉浏览器站点数据（或换设备 / 开无痕）就全部清空，不占用任何服务器。

> 适合：个人记账、订单/收款跟踪演示、把后端代码包快速变成一个可展示的网页。

## ✨ 功能

| 页面 | 能做的事 |
|------|----------|
| 🏠 首页 | KPI 概览 + 模块关系图；右上角「♻ 清空并重置」一键清空本地数据、恢复初始演示数据 |
| 📦 订单汇总 | 新建 / 编辑 / 删除订单，按店铺或销账状态筛选、点列头排序、批量删除、导出 CSV |
| 💸 销账系统 | 按订单添加收款，自动重算 已收 / 剩余 / 销账状态（unpaid / partial / paid / overdrawn） |
| 🏊 店铺结余池 | 新建池、收款充值 / 手动调整、自动抵扣（含超支记账，可用余额可为负）、查看抵扣明细 |
| 🗂️ 架构总览 | 只读：文件树、路由清单、数据表（源自 erp_modules 拆分包） |

## 📁 文件结构

```
小a工作台/
├── index.html              # 入口页面
├── assets/
│   ├── css/styles.css      # 样式系统（浅色主题）
│   └── js/
│       ├── data.js         # 模块元数据 + 演示 mock 数据
│       └── app.js          # 应用逻辑（本地存储 + 全套增删改查）
├── .nojekyll               # 让 GitHub Pages 跳过 Jekyll 处理
└── .github/workflows/pages.yml   # 推送即自动部署到 GitHub Pages
```

## 💻 本地预览

无需安装任何依赖，任选一种方式：

```bash
# 方式一：Python（系统自带）
python -m http.server 5173
# 然后浏览器打开 http://localhost:5173

# 方式二：Node
npx serve .
```

直接双击 `index.html` 也能打开，但用本地服务器（上面两种）能避免个别浏览器对 `file://` 的限制。

## 🚀 部署到 GitHub Pages

**方式 A：用 GitHub Actions 自动部署（推荐）**

1. 在 GitHub 新建一个仓库（如 `xiao-a-workbench`）。
2. 把本目录全部文件 push 到 `main` 分支。
3. 仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。
4. 之后每次 `git push` 到 `main`，Actions 会自动构建并发布，几分钟后即可在
   `https://<你的用户名>.github.io/<仓库名>/` 访问。

**方式 B：不用 Actions，纯静态托管**

1. 仓库 **Settings → Pages → Source** 选择 **Deploy from a branch**。
2. Branch 选 `main`、目录选 `/ (root)`，保存。
3. push 后即可访问（`.nojekyll` 已包含，确保 `assets/` 等带下划线前缀的文件也能正常加载）。

## 🔒 数据说明

- 所有增删改查只写入**当前浏览器**的 localStorage（键名 `xiao_a_workbench_v1`）。
- 浏览器隐私模式禁用了存储时，会自动回退为「内存态」：照样能操作，只是刷新即重置。
- 想要换设备同步？本版本**不做**任何云端同步——它本就是「不保留数据、清掉即无」的个人工作台。

## 📝 想接真实后端？

把 `assets/js/data.js` 里的 mock 数据换成对你自己后端（如原 `erp_modules` 的 Flask 路由）的 `fetch` 调用，再在 `app.js` 里把本地增删改查改成对应的 API 请求即可。
