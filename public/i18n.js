// .naka registry — tiny client-side i18n (EN / 简体中文). No network, no tracking. Choice lives in localStorage.
(function () {
  var KEY = 'naka-lang';
  var ZH = {
    // static chrome (index / blocks / secure)
    'title.home': '.naka 名册 — 护盾者之名',
    'title.names': '名册 — .naka 名册',
    'title.name': '{name} — .naka 名册',
    'title.blocks': '减半观察 — .naka 名册',
    'title.secure': '锁定名字 — .naka 名册',
    'brand.sub': '名册',
    'nav.check': '查名',
    'nav.registry': '名册',
    'nav.secure': '锁定',
    'nav.secure.aria': '锁定名字',
    'nav.blocks': '₿ 减半',
    'nav.blocks.aria': '减半',
    'nav.dao': '理事会',
    'dao.h1': 'Naka理事会',
    'nav.dao.aria': 'Naka理事会',
    'title.dao': 'Naka理事会 — .naka 名册',
    'load.dao': '正在点票…',
    'dao.live': '实时计票',
    'dao.round': '第 {n} 轮',
    'dao.status.open': '投票进行中',
    'dao.status.closed': '已结束',
    'dao.ballots': '总票数',
    'dao.cands': '候选合集',
    'dao.snap': '快照区块',
    'dao.none': '以上皆不选',
    'dao.votes': '{n} 票',
    'dao.ago': '{s} 秒前更新',
    'dao.agom': '{m} 分钟前更新',
    'dao.stale': '上游暂时无响应，显示缓存数据',
    'dao.go': '去金库投票 →',
    'dao.ed': '{n} 版',
    'dao.unknown': '未知合集',
    'dao.hidden': '本轮暂不公开实时票数。',
    'dao.winner': '第 {n} 轮胜出：{w}',
    'dao.credit': '票数来自 <a href="https://ord-dropz.xyz/" target="_blank" rel="noopener" data-umami-event="outbound-ord-dropz" data-umami-event-page="council" data-umami-event-label="ord-dropz-credit">Ord Dropz</a> 的 Naka 理事会投票。只读镜像，每 60 秒刷新；投票请在 Shielded Vault 中进行。',
    'dao.err': '投票数据暂时无法获取。',
    'dao.mini': 'Naka理事会实时投票',
    'dao.mini.all': '查看完整票数 →',
    'load.index': '正在挖掘索引…',
    'load.blocks': '正在数区块…',
    'foot.back': '← .naka 名册',
    'foot.name': '.NAKA 名册',
    'foot.built': '构建于比特币',
    'foot.dropz': '由 ORD DROPZ 护盾守护',
    'foot.by': '名册作者',
    'foot.join': '加入 Discord',
    'foot.note': '独立社区项目 · 与 Ord Dropz 无官方关联',
    'foot.yet': '（暂时 😉）',
    'sync': '共 {count} 个名字 · 已索引至区块 {h} · {state}',
    'sync.ok': '摘要已验证 ✓',
    'sync.bad': '摘要未验证',
    'toast.copied': '已复制。小心轻放。',
    'err.index': '索引没有回应。{msg}',
    // secure (shared with home)
    'sec.h1': '锁定你的 <em>.NAKA</em> 名字',
    'sec.h2': '锁定你的 .naka 名字',
    'sec.found': '找到可用的名字了？通过 <a class="vault" href="https://ord-dropz.xyz/wallet" target="_blank" rel="noopener">Shielded Vault（护盾金库）</a>认领。',
    'sec.visitors': '任何访客都可以通过 Shielded Vault 锁定 .naka 和 .shield 名字。',
    'sec.reg': '名字注册在比特币上。第一条有效铭文即可锁定该名字。',
    'sec.reg2': '名字注册在比特币上，第一条有效铭文即可锁定该名字。',
    'sec.avail': '在注册确认之前，可用状态随时可能变化。',
    'sec.get': '获取名字 →',
    'sec.note': '本页用于锁定名字，<b>不</b>用于领取 $SHNAKAS 奖励。奖励起始区块请见 <a href="/halving" target="_self">₿ 减半页面（含 $SHNAKAS 质押周）</a>。',
    // home / checker
    'home.h1': '抢在<em>别人</em>之前<br>认领你的名字。',
    'home.lede': '在比特币上的 Shielded Ordinals 世界里，找到属于你的名字。',
    'home.ph': '输入名字(.naka)',
    'home.aria': '要查询的名字',
    'home.btn': '查询',
    'st.total': '已认领',
    'st.three': '三位数已占',
    'home.fresh': '新坟',
    'home.grave': '000–999 墓园',
    'g.taken': '{n} — 已占',
    'g.free': '{n} — 空闲',
    'g.lt': '已占（{n}）',
    'g.lf': '空闲（{n}）',
    'g.tap': '点一格看看',
    'home.len': '名字长度',
    'len.title': '长度为 {k} 的名字：{v} 个',
    'home.reg': '名册',
    'home.unavail': '此服务器暂时拿不到名单。{extra}这不代表名册是空的，也不是空闲名字列表。',
    'home.unavail.n': '索引显示共有 {n} 个名字。',
    'chk.loading': '正在翻查名册…',
    'chk.unv': '未验证',
    'chk.noanswer': '查询服务没有回应。这不是注册结果。',
    'chk.invalid': '不是有效名字',
    'chk.rules': '规则：3–20 个字符 · a–z、0–9，字符之间可用单个短横线 · 以 .naka 或 .shield 结尾。',
    'chk.reserved': '保留',
    'chk.reserved.sub': '<b>{label}</b> 在内部保留名单上。两个后缀都没人能拿到，送花也没用。',
    'chk.pending': '待确认',
    'chk.pending.sub': '<b>{name}</b> 已付款，正在等待出块。遗体已上台，手续办理中。',
    'chk.cached': '缓存记录显示 <b>{name}</b>，但摘要未经验证。请勿视为已确认。',
    'chk.other': '你查询的是 <b>{asked}</b>，但标签 <b>{label}</b> 已归 <b>{holder}</b> 所有。一个标签只有一个主人，两个后缀通用。',
    'chk.forever': '已被认领，永久有效。不得开棺。',
    'chk.taken': '已占用',
    'chk.holds': '{name} ✓ 持有',
    'kv.name': '名字',
    'kv.claimed': '认领于',
    'kv.block': '区块',
    'kv.blockn': '区块 {h}',
    'kv.insc': '铭文',
    'kv.points': '指向',
    'copy': '复制',
    'chk.conflict': '注册服务报告了 <b>{label}</b> 的一条记录，但本索引尚未收录。这不代表空缺。',
    'chk.notconf': '<b>{label}</b> 尚未确认。{why}这并不表示该名字空闲。',
    'chk.why.mint': '注册服务未确认它空闲。',
    'chk.why.digest': '本次加载的名册摘要未通过验证。',
    'chk.again': '等索引验证后再查一次，或在付款前到 <a href="{vault}" target="_blank" rel="noopener">Shielded Vault</a> 确认。',
    'chk.free': '空闲',
    'chk.free.sub': '截至区块 {h}，<b>{label}</b> 尚无人认领。墓园里有空位。选一个后缀，另一个会随之锁定。',
    'chk.free.note': '在 <a href="{vault}" target="_blank" rel="noopener">Shielded Vault</a>（“Get a name”）中注册，或自己铭刻记录。谁的铭文先落块谁就赢，所以这里的“空闲”只是快照，不是预留。',
    // server reasons (rules.mjs)
    'r.empty': '先输入点什么吧。死人都有名字。',
    'r.ending': '这里没有“.{end}”这个后缀。只有 .naka 或 .shield。',
    'r.dot': '只能有一个点，放在后缀前面。',
    'r.space': '不能有空格。名字只能是一个词，就像预算紧张的墓碑。',
    'r.short': '至少 3 个字符。',
    'r.long': '最多 20 个字符（这个有 {n} 个）。',
    'r.chars': '只能用字母 a–z、数字和短横线。不要表情，不要重音，不要花样。',
    'r.dash': '短横线只能放在字符之间，一次一个。不能在首尾，也不能连用。',
    'r.invalid': '不是有效的名字。',
    'r.reserved': '在协议保留名单上（可能被误认为平台、协议或钱包）。无论哪个后缀，谁都拿不到。',
    // directory
    'dir.h1': '<em>名册</em>',
    'dir.lede': '每个护盾名字，.naka 与 .shield 一起，按比特币埋葬它们的顺序排列。<b>#1</b> 最先认领。',
    'dir.show': '显示',
    'v.first': '最早创建', 'v.newest': '最新', 'v.naka': '仅 .naka', 'v.shield': '仅 .shield',
    'f.ph': '搜索名字…', 'f.search': '搜索', 'f.ending': '后缀', 'f.allend': '全部后缀',
    'f.length': '长度', 'f.anylen': '任意长度', 'f.chars': '{n} 个字符',
    'f.kind': '类型', 'f.anychars': '任意字符', 'f.digits': '仅数字', 'f.letters': '仅字母', 'f.mixed': '混合',
    'f.sort': '排序', 's.first': '最早认领', 's.last': '最新认领', 's.short': '最短',
    'th.rank': '认领排名：#1 = 最先认领',
    'dir.rev': '反查',
    'dir.rev.p': '粘贴一个护盾地址（shord1…），看看哪些名字指向它。',
    'dir.rev.aria': '护盾地址',
    'dir.rev.btn': '查找',
    'dir.rev.bad': '这不是护盾地址。护盾地址以 <b>shord1</b> 开头，后面跟 128 个十六进制字符。',
    'cnt.unavail': '名单不可用',
    'cnt.unavail.n': '名单不可用 · 索引显示共 {n} 个名字',
    'cnt': '共 {total} 个名字，显示 {n} 个',
    'dir.unavail': '此服务器暂时拿不到名单。{link}这不代表名册是空的。',
    'dir.unavail.link': '<a href="{href}">查询“{q}”。</a>',
    'dir.none': '这里没有尸体。{link}',
    'dir.none.link': '<a href="{href}">“{q}”看起来空闲 — 去查询 →</a>',
    // name / address
    'np.back': '← 名册',
    'np.nothing': '这里什么都没埋。',
    'np.rank': '第 <b class="rank">#{rk}</b> 个认领，共 {total} 个',
    'np.at': '认领于区块 {h}{date}。<span class="pill x">{other}</span> 随之锁定。',
    'np.copyaddr': '复制地址', 'np.copyname': '复制名字', 'np.vault': '此金库的全部名字',
    'np.also': '同样指向这里',
    'np.send': '发送到 .naka 名字',
    'np.send1': '想把 Shielded Ordinal 发送给 <b>{name}</b>？',
    'np.send2': '只需打开 <a class="vault" href="{vault}" target="_blank" rel="noopener">Shielded Vault</a>，在 Send（发送）栏输入 <b>{name}</b>，按步骤完成转账即可。',
    'np.send3': '你的 .naka 名字可以作为在比特币上接收 Shielded Ordinals 的目的地。',
    'ap.label': '护盾地址',
    'ap.count': '有 {n} 个名字指向这里',
    'ap.none': '没有名字',
    'ap.anon': '匿名。没有墓碑。护盾的意义正在于此。',
    'ap.note': '金库里有什么是私密的；这里只显示指向它的公开名字记录。',
    // blocks
    'hw.h2': '₿ 减半观察',
    'hw.caveat': '区块奖励又要死一次了',
    'hv.pct': '本纪元已走过 {p}%',
    'hv.reward': '区块补贴 {a} BTC → {b} BTC',
    'hp.h1': '减半<br><em>观察</em>',
    'hp.lede': '比特币实时区块高度，倒数到区块 <b>{t}</b>，届时区块奖励又死一次。准确说，死一半。',
    'hp.est': '按每块约 10 分钟估算，大约在 <b>{date}</b>（{eta}）。<b>这只是估算</b>：实际出块时间会漂移，日期也跟着漂。',
    'hp.at': '减半区块', 'hp.eta': '预计日期（估算）', 'hp.now': '当前补贴', 'hp.after': '减半后补贴', 'hp.epoch': '纪元',
    'hp.p1': '每 <b>210,000 个区块</b>（约四年），矿工每块获得的新币补贴减半。50 → 25 → 12.5 → 6.25 → 3.125 BTC。上一次是 2024 年 4 月的区块 <b>840,000</b>。',
    'hp.p2': '在区块 <b>{t}</b>，补贴从 {a} 降到 {b} BTC。没人投票，也没人拦得住。代码只是安静地把奖励砍半，然后继续出块。',
    'hp.p3': '交易手续费不会减半。本页只数区块，不构成任何建议。',
    'bw.unavail': '暂时拿不到区块高度。宁可不显示，也不瞎猜。',
    'bw.tip': '最新高度', 'bw.stale': '过期',
    'bw.to': '距 {t} 的区块数',
    'bw.est': '预计时间（约 10 分钟/块）',
    'bw.details': '详情 →',
    'eta.d': '约 {d} 天 {h} 小时', 'eta.h': '约 {h} 小时 {m} 分', 'eta.m': '约 {m} 分钟',
    'bp.unavail': '高度不可用',
    'bp.unavail.sub': 'mempool.space 和 blockstream.info 都没有回应。宁可不显示，也不瞎猜。',
    'bp.togo': '还差 {n} 个区块',
    'bp.remain': '剩余', 'bp.blocks': '{n} 个区块',
    'bp.source': '来源', 'bp.checked': '{src} · 查询于 {t}',
    'bp.what': '这是什么',
    'bp.note': '高度数据来自 mempool.space（备用 blockstream.info），本服务器缓存约 60 秒。日期范围按 mempool.space 近期平均出块时间和每块 10 分钟分别估算，仅供参考。',
    'hp.range': '预计 {r}',
    'hp.est2': '<b>{r}</b>。较早的一端按近期平均出块时间（约 {m} 分钟）计算，较晚的一端按 10 分钟计算。<b>这只是估算</b>：实际出块时间会漂移，日期也跟着漂。',
    // $SHNAKAS staking
    'sk.h2': '$SHNAKAS 质押周',
    'sk.weekof': '第 {w} 周 / 共 {t} 周',
    'sk.paid': '已发放 {n} 周',
    'sk.left': '本周剩余区块',
    'sk.est': '预计（约 {m} 分钟/块）',
    'sk.into': '第 {w} 周已过 {n} / 1,008 个区块',
    'sk.weekend': '第 {w} 周在区块 {b} 结束。距收益结束还有 {n} 个区块。',
    'sk.w1': '第 1 周', 'sk.overall': '全部 78 周', 'sk.w78': '第 78 周',
    'sk.end': '收益在区块 <b>1,050,324</b> 结束（971,700 + 78 × 1,008），约在区块 1,050,000 减半之后 324 个区块（约 2 天）。',
    'sk.f1': '每周 <b>1,008 个区块</b>，从区块 <b>971,700</b> 开始，共 78 周。',
    'sk.f2': '每周结束后才发放该周奖励。',
    'sk.f3': '只有在金库中<b>未挂单</b>的作品才会累积收益。',
    'sk.f4': '无需签名，无需锁定。随时可领取。',
    'sk.note': '周数按 Ord Dropz 金库的时间表计算。每件作品的收益按特征加权，所以这里不显示。',
    'sk.before': '尚未开始',
    'sk.before.sub': '第 1 周从区块 <b>{b}</b> 开始：还差 {n} 个区块（{eta}，估算）。',
    'sk.ended': '全部 {w} 周已结束',
    'sk.ended.sub': '收益已在区块 {b} 停止。每一周都已发放；随时可领取。',
    'sk.allpaid': '{t} / {t} 周',
    'sk.c.before': '$SHNAKAS 质押从区块 {b} 开始 · 还差 {n} 个区块',
    'sk.c.ended': '$SHNAKAS 质押：全部 {w} 周已结束',
    'sk.cal': '📅 把领取提醒加入日历',
    'sk.cal.sub': '每个剩余周结束各一条提醒（.ics）。时间为估算；区块才是真正的截止点。随时重新下载即可刷新时间。',
    'sk.c.cal': '📅 提醒',
    'sk.c.left': '剩余 {n} 个区块（{eta}）'
  };
  // English server reasons -> zh keys (exact or pattern)
  var REASONS = [
    [/^Type something first\. Even the dead have names\.$/, 'r.empty'],
    [/^“\.(.*)” isn't an ending here\. Only \.naka or \.shield\.$/, 'r.ending', 'end'],
    [/^One dot only, before the ending\.$/, 'r.dot'],
    [/^No spaces\. /, 'r.space'],
    [/^At least 3 characters\.$/, 'r.short'],
    [/^At most 20 characters \(that's (\d+)\)\.$/, 'r.long', 'n'],
    [/^Letters a–z, numbers and dashes only\./, 'r.chars'],
    [/^A dash goes between characters/, 'r.dash'],
    [/^Not a valid name\.$/, 'r.invalid'],
    [/^On the protocol’s reserved list/, 'r.reserved']
  ];
  function pick() {
    var q = null;
    try { q = new URLSearchParams(location.search).get('lang'); } catch (e) {}
    if (q) { q = /^zh/i.test(q) ? 'zh-CN' : 'en'; try { localStorage.setItem(KEY, q); } catch (e) {} return q; }
    try { return localStorage.getItem(KEY) === 'zh-CN' ? 'zh-CN' : 'en'; } catch (e) { return 'en'; }
  }
  var lang = pick();
  var subs = [];
  var orig = new WeakMap();
  function fill(s, v) { return s.replace(/\{(\w+)\}/g, function (m, k) { return v && k in v ? v[k] : m; }); }
  // t(key, english, vars): English mode returns the English text untouched.
  function t(key, en, vars) { return lang === 'zh-CN' && ZH[key] != null ? fill(ZH[key], vars) : en; }
  function reason(en) {
    if (lang !== 'zh-CN') return en;
    for (var i = 0; i < REASONS.length; i++) { var m = REASONS[i][0].exec(en); if (m) { var v = {}; if (REASONS[i][2]) v[REASONS[i][2]] = m[1]; return fill(ZH[REASONS[i][1]], v); } }
    return en;
  }
  function applyStatic(root) {
    document.documentElement.lang = lang;
    (root || document).querySelectorAll('[data-i18n]').forEach(function (el) {
      if (!orig.has(el)) orig.set(el, el.innerHTML);
      var k = el.getAttribute('data-i18n');
      el.innerHTML = lang === 'zh-CN' && ZH[k] != null ? ZH[k] : orig.get(el);
    });
    (root || document).querySelectorAll('[data-i18n-aria]').forEach(function (el) {
      if (!el.hasAttribute('data-en-aria')) el.setAttribute('data-en-aria', el.getAttribute('aria-label') || '');
      var k = el.getAttribute('data-i18n-aria');
      el.setAttribute('aria-label', lang === 'zh-CN' && ZH[k] != null ? ZH[k] : el.getAttribute('data-en-aria'));
    });
    var b = document.getElementById('lang-toggle');
    if (b) {
      b.textContent = lang === 'zh-CN' ? 'EN' : '中文';
      b.setAttribute('aria-label', lang === 'zh-CN' ? 'Switch to English' : '切换到简体中文');
      b.title = b.getAttribute('aria-label');
      b.lang = lang === 'zh-CN' ? 'en' : 'zh-CN';
    }
  }
  function set(l) {
    lang = l === 'zh-CN' ? 'zh-CN' : 'en';
    try { localStorage.setItem(KEY, lang); } catch (e) {}
    try { var u = new URL(location.href); if (u.searchParams.has('lang')) { u.searchParams.delete('lang'); history.replaceState(history.state, '', u.pathname + u.search + u.hash); } } catch (e) {}
    applyStatic();
    subs.forEach(function (f) { try { f(lang); } catch (e) {} });
  }
  function mount() {
    var nav = document.querySelector('header.top nav');
    if (nav && !document.getElementById('lang-toggle')) {
      var b = document.createElement('button');
      b.type = 'button'; b.id = 'lang-toggle'; b.className = 'lang-toggle';
      b.addEventListener('click', function () { set(lang === 'zh-CN' ? 'en' : 'zh-CN'); });
      nav.appendChild(b);
    }
    applyStatic();
  }
  document.documentElement.lang = lang;
  window.NAKA_I18N = { get lang() { return lang; }, t: t, reason: reason, set: set, apply: applyStatic, onChange: function (f) { subs.push(f); } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
