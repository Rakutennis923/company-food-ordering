"use client";

/* eslint-disable react-hooks/set-state-in-effect, react-hooks/purity, react-hooks/exhaustive-deps */

import { useEffect, useMemo, useRef, useState } from "react";

type MenuItem = { id: string; name: string; price: number; category?: string };
type Store = {
  id: string;
  name: string;
  category: string;
  rating: number;
  phone?: string;
  address?: string;
  meals: string[];
  menu: MenuItem[];
  active?: boolean;
};
type Order = {
  id: string;
  staff: string;
  storeId: string;
  storeName: string;
  item: string;
  price: number;
  qty: number;
  note: string;
  createdAt: string;
};
type ClosedOrder = {
  id: string;
  storeName: string;
  orders: Order[];
  total: number;
  closedAt: string;
};

const seedStores: Store[] = [
  { id: "S001", name: "上野烤肉飯", category: "便當", rating: 4.1, meals: ["中餐", "晚餐"], menu: [{id:"M001",name:"烤肉飯",price:115},{id:"M002",name:"烤雞排飯",price:120},{id:"M003",name:"烤雞腿飯",price:120}] },
  { id: "S002", name: "東海排骨", category: "便當", rating: 4.0, meals: ["中餐", "晚餐"], menu: [{id:"M004",name:"雞腿飯",price:120},{id:"M005",name:"排骨飯",price:120},{id:"M006",name:"香雞排飯",price:110}] },
  { id: "S003", name: "溫州大餛飩", category: "麵食", rating: 3.9, meals: ["中餐", "晚餐"], menu: [{id:"M007",name:"招牌香辣麵",price:65},{id:"M008",name:"牛肉麵（小）",price:130},{id:"M009",name:"鮮蝦大餛飩湯",price:85}] },
  { id: "S004", name: "越來越好吃", category: "越式", rating: 4.5, meals: ["中餐", "晚餐"], menu: [{id:"M010",name:"牛肉湯河粉",price:130},{id:"M011",name:"越式烤肉飯",price:120},{id:"M012",name:"香酥雞涼拌米線",price:130}] },
  { id: "S005", name: "向陽冬瓜肉飯", category: "便當", rating: 4.2, meals: ["中餐"], menu: [{id:"M013",name:"冬瓜肉飯盒",price:80},{id:"M014",name:"招牌雞腿排飯",price:120},{id:"M015",name:"煎豬排飯",price:110}] },
  { id: "S006", name: "麵掌門", category: "麵食", rating: 4.6, meals: ["中餐", "晚餐"], menu: [{id:"M016",name:"雪花牛肉麵－紅燒原味",price:170},{id:"M017",name:"腱心牛肉麵－清燉",price:190},{id:"M018",name:"椒麻皮蛋牛肉乾拌麵",price:170}] },
  { id: "S007", name: "韓國板門烤肉", category: "韓式", rating: 4.1, meals: ["中餐", "晚餐"], menu: [{id:"M019",name:"泡菜炒飯",price:140},{id:"M020",name:"韓式醬醬麵",price:125},{id:"M021",name:"泡菜鍋",price:155}] },
  { id: "S008", name: "勝曜", category: "咖哩／丼飯", rating: 4.4, meals: ["中餐", "晚餐"], menu: [{id:"M022",name:"勝曜壽喜豚肉丼",price:135},{id:"M023",name:"日式咖哩豬排飯",price:170},{id:"M024",name:"博多豚骨拉麵",price:160}] },
];

const staffNames = ["王小明", "陳小華", "林婉茹", "黃立鈞"];
const money = (value: number) => new Intl.NumberFormat("zh-TW", { style: "currency", currency: "TWD", maximumFractionDigits: 0 }).format(value);
const nowLocal = () => new Date().toISOString();

function useLocalState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const hydrated = useRef(false);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved) setValue(JSON.parse(saved));
    } finally { hydrated.current = true; }
  }, [key]);
  useEffect(() => {
    if (hydrated.current) localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);
  return [value, setValue] as const;
}

export default function OrderingApp() {
  const [tab, setTab] = useState<"order"|"stores"|"history"|"settings">("order");
  const [stores, setStores] = useLocalState<Store[]>("food-stores-v3", seedStores);
  const [orders, setOrders] = useLocalState<Order[]>("food-current-orders-v3", []);
  const [history, setHistory] = useLocalState<ClosedOrder[]>("food-order-history-v3", []);
  const [selectedIds, setSelectedIds] = useState<string[]>(seedStores.map(store => store.id));
  const [winnerId, setWinnerId] = useState("");
  const [spinning, setSpinning] = useState(false);
  const [highlightId, setHighlightId] = useState("");
  const [mealFilter, setMealFilter] = useState("全部餐期");
  const [ratingFilter, setRatingFilter] = useState(3);
  const [duty, setDuty] = useState("");
  const [deadline, setDeadline] = useState("11:20");
  const [staff, setStaff] = useState(staffNames[0]);
  const [itemId, setItemId] = useState("");
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");
  const [searchName, setSearchName] = useState("");
  const [searchResults, setSearchResults] = useState<Store[]>([]);
  const [toast, setToast] = useState("");
  const [apiUrl, setApiUrl] = useLocalState("food-api-url-v3", "");
  const [apiToken, setApiToken] = useLocalState("food-api-token-v3", "");
  const [syncing, setSyncing] = useState(false);

  const visibleStores = useMemo(() => stores.filter(s =>
    s.active !== false &&
    s.rating >= ratingFilter &&
    (mealFilter === "全部餐期" || s.meals.includes(mealFilter))
  ), [stores, mealFilter, ratingFilter]);
  const winner = stores.find(s => s.id === winnerId);
  const activeStore = winner || (selectedIds.length === 1 ? stores.find(s => s.id === selectedIds[0]) : undefined);
  const selectedItem = activeStore?.menu.find(m => m.id === itemId);
  const currentTotal = orders.reduce((sum, order) => sum + order.price * order.qty, 0);
  const selectedStores = stores.filter(store => selectedIds.includes(store.id)).slice(0, 8);
  const storeEmoji = (store: Store) =>
    store.category.includes("麵") ? "🍜" :
    store.category.includes("越") ? "🍲" :
    store.category.includes("韓") ? "🥘" :
    store.category.includes("咖哩") ? "🍛" : "🍽️";

  useEffect(() => {
    if (selectedIds.length === 1) setWinnerId(selectedIds[0]);
    if (selectedIds.length !== 1 && winnerId && !selectedIds.includes(winnerId)) setWinnerId("");
  }, [selectedIds, winnerId]);
  useEffect(() => setItemId(activeStore?.menu[0]?.id || ""), [activeStore?.id]);
  useEffect(() => {
    const last = history[0];
    if (!last) return;
    if (Date.now() - new Date(last.closedAt).getTime() > 60 * 60 * 1000 && orders.length === 0) {
      setSelectedIds([]); setWinnerId(""); setDuty("");
    }
  }, []);

  const flash = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };

  async function api(action: string, data: Record<string, unknown> = {}) {
    if (!apiUrl || !apiToken) throw new Error("尚未設定 Apps Script 連線");
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action, token: apiToken, ...data }),
    });
    const result = await response.json();
    if (!result.ok) throw new Error(result.error || "連線失敗");
    return result;
  }

  async function syncStores() {
    try {
      setSyncing(true);
      const result = await api("listStores");
      const remote: Store[] = (result.stores || []).map((row: Record<string,string>) => ({
        id: row["店家ID"], name: row["店名"], category: row["料理類型"] || "其他",
        rating: Number(row["Google評分"] || 0), phone: row["電話"], address: row["地址"],
        meals: ["早餐","中餐","晚餐"].filter(m => row[m] === "是"), menu: [], active: row["啟用狀態"] !== "停用",
      }));
      if (remote.length) {
        setStores(old => remote.map(s => ({...s, menu: old.find(x => x.id === s.id)?.menu || []})));
        flash(`已同步 ${remote.length} 間店家`);
      }
    } catch (error) { flash(String((error as Error).message)); }
    finally { setSyncing(false); }
  }

  function toggleStore(id: string) {
    setWinnerId("");
    setSelectedIds(current => current.includes(id)
      ? current.filter(x => x !== id)
      : current.length < 8 ? [...current, id] : current);
  }

  function spin() {
    if (selectedIds.length < 2 || spinning) return;
    setSpinning(true); setWinnerId("");
    const duration = 5000 + Math.floor(Math.random() * 2000);
    const started = Date.now();
    let index = 0;
    const timer = window.setInterval(() => {
      setHighlightId(selectedIds[index++ % selectedIds.length]);
      if (Date.now() - started >= duration) {
        window.clearInterval(timer);
        const id = selectedIds[Math.floor(Math.random() * selectedIds.length)];
        setHighlightId(id); setWinnerId(id); setSpinning(false);
        flash(`今天吃：${stores.find(s => s.id === id)?.name}`);
      }
    }, 180);
  }

  function addOrder() {
    if (!activeStore || !selectedItem || !staff.trim()) return flash("請先選店家、同事與餐點");
    const order: Order = {
      id: `O${Date.now()}`, staff: staff.trim(), storeId: activeStore.id, storeName: activeStore.name,
      item: selectedItem.name, price: selectedItem.price, qty: Math.max(1, qty), note: note.trim(), createdAt: nowLocal(),
    };
    setOrders([...orders, order]); setQty(1); setNote(""); flash("已加入共同訂單");
  }

  function closeOrder() {
    if (!orders.length) return flash("目前沒有訂單");
    const record: ClosedOrder = { id: `C${Date.now()}`, storeName: activeStore?.name || orders[0].storeName, orders, total: currentTotal, closedAt: nowLocal() };
    setHistory([record, ...history]); setOrders([]); flash("已結單並保存紀錄");
  }

  async function searchStore() {
    const q = searchName.trim();
    if (!q) return;
    try {
      if (apiUrl && apiToken) {
        const result = await api("searchPlaces", { query: q });
        const found = (result.places || []).map((p: Record<string,unknown>, index: number) => ({
          id: String(p.id || p.placeId || `NEW${Date.now()}${index}`), name: String(p.name || p.displayName || q),
          category: String(p.category || "其他"), rating: Number(p.rating || 0), phone: String(p.phone || ""),
          address: String(p.address || ""), meals: ["中餐","晚餐"], menu: [],
        }));
        setSearchResults(found);
      } else {
        setSearchResults([{ id:`NEW${Date.now()}`, name:q, category:"待分類", rating:3.5, meals:["中餐","晚餐"], menu:[] }]);
      }
    } catch { setSearchResults([{ id:`NEW${Date.now()}`, name:q, category:"待分類", rating:3.5, meals:["中餐","晚餐"], menu:[] }]); }
  }

  async function saveSearchedStore(store: Store) {
    const existing = stores.find(s => s.name === store.name && (s.address || "") === (store.address || ""));
    const saved = {...store, id: existing?.id || `S${String(stores.length + 1).padStart(3,"0")}`, active:true};
    setStores(current => existing ? current.map(s => s.id === existing.id ? {...s,...saved,id:s.id} : s) : [...current,saved]);
    setMealFilter("全部餐期"); setRatingFilter(3); setSearchResults([]); setSearchName("");
    try {
      if (apiUrl && apiToken) await api("saveStore", { data: {
        "店家ID": saved.id, "店名": saved.name, "料理類型": saved.category,
        "早餐": saved.meals.includes("早餐") ? "是":"否", "中餐": saved.meals.includes("中餐") ? "是":"否",
        "晚餐": saved.meals.includes("晚餐") ? "是":"否", "Google評分": saved.rating,
        "電話": saved.phone || "", "地址": saved.address || "", "啟用狀態":"啟用",
      }});
      flash("已存入並加入店家清單");
    } catch { flash("已先存入本機清單；連線後可再同步"); }
  }

  function deleteStore(id: string) {
    if (!confirm("確定刪除這間店家？")) return;
    setStores(stores.filter(s => s.id !== id)); setSelectedIds(selectedIds.filter(x => x !== id));
  }

  function addMenuItem(storeId: string) {
    const name = prompt("餐點名稱");
    if (!name) return;
    const price = Number(prompt("價格") || 0);
    setStores(stores.map(s => s.id === storeId ? {...s, menu:[...s.menu,{id:`M${Date.now()}`,name,price}]} : s));
  }

  return (
    <main>
      <header className="topbar">
        <div className="brand">
          <div className="brand-logo"><span>🐹</span><b>餃子</b></div>
          <div>
            <h1>友成幸福團隊・公司訂餐</h1>
            <p className="subtitle">📍 桃園市八德區大智路73號・500公尺美食圈</p>
          </div>
        </div>
        <nav>
          <button className={tab==="order"?"active":""} onClick={()=>setTab("order")}>⌂ 今日訂餐</button>
          <button className={tab==="history"?"active":""} onClick={()=>setTab("history")}>▣ 訂餐紀錄</button>
          <button className={tab==="stores"?"active":""} onClick={()=>setTab("stores")}>♟ 團隊成員</button>
          <button className={tab==="settings"?"active":""} onClick={()=>setTab("settings")}>⚙ 系統設定</button>
        </nav>
      </header>

      {toast && <div className="toast">{toast}</div>}

      {tab === "order" && <div className="page">
        <section className="neon-hero">
          <div className="hero-heading">
            <h2>☆ 今日午餐選店 ☆</h2>
            <p>值班人員在下方選擇 2～8 家即可抽選；只選 1 家就直接開放點餐。</p>
          </div>
          <div className="marquee-wrap">
            <aside className="side-sign left">好<br/>吃<br/>才<br/>是<br/>王</aside>
            <div className="marquee">
              {selectedStores.map(store=><article key={store.id} className={`stage-store ${highlightId===store.id?"lit":""} ${winnerId===store.id?"winner":""}`} onClick={()=>toggleStore(store.id)}>
                <b className="stage-check">✓</b>
                <div className="food-icon">{storeEmoji(store)}</div>
                <div className="stage-copy">
                  <h3>{store.name}</h3>
                  <p><strong>★ {store.rating.toFixed(1)}</strong><span>{120 + Number(store.id.slice(1)) * 37}m</span></p>
                  <div><em>{store.category}</em><em className="maps">Maps</em></div>
                  <small>☎ 電話　⌖ 地圖　▤ 菜單</small>
                </div>
              </article>)}
            </div>
            <aside className="side-sign right">吃<br/>飽<br/>才<br/>有<br/>戰<br/>鬥<br/>力</aside>
          </div>
          <div className="draw-stage">
            <span>≫≫≫</span>
            <button className="spin" disabled={selectedIds.length<2||spinning} onClick={spin}>{spinning?"抽選中…":"啟動抽選"}</button>
            <span>≪≪≪</span>
            <small>5–7 秒隨機抽選</small>
          </div>
        </section>

        <section className="stats-row">
          <div><span>👥</span><p>已點餐<strong>{orders.length} 人</strong></p></div>
          <div><span>🧑‍🤝‍🧑</span><p>候選店家<strong>{selectedIds.length} 家</strong></p></div>
          <div><span>👛</span><p>目前總額<strong>{money(currentTotal)}</strong></p></div>
          <div><span>◷</span><p>今日截止<strong>{deadline}</strong></p></div>
        </section>

        <section className="dashboard-grid">
          <div className="panel selection-panel">
            <div className="section-title"><div><span>01</span><h2>同事開始點餐</h2></div><p>值班人員先選 1～8 家店</p></div>
            <div className="filters">
              <small>餐期</small>
              {["全部餐期","早餐","中餐","晚餐"].map(x=><button key={x} className={mealFilter===x?"selected":""} onClick={()=>setMealFilter(x)}>{x}</button>)}
              <small>評分</small>
              {[3,4].map(x=><button key={x} className={ratingFilter===x?"selected":""} onClick={()=>setRatingFilter(x)}>★ {x}.0以上</button>)}
              <b>目前顯示 {visibleStores.length} 家</b>
            </div>
            <div className="store-strip">
              {visibleStores.map(store=><button key={store.id} className={`store-pill ${selectedIds.includes(store.id)?"chosen":""} ${highlightId===store.id?"lit":""} ${winnerId===store.id?"winner":""}`} onClick={()=>toggleStore(store.id)}>
                <i>{selectedIds.includes(store.id)?"✓":"＋"}</i><span>{storeEmoji(store)} {store.name}</span>
              </button>)}
            </div>
            <div className="draw-row">
              <p>已選 <strong>{selectedIds.length}</strong> 家，可按上方啟動抽選</p>
              <div><label>值班人員<input value={duty} onChange={e=>setDuty(e.target.value)} placeholder="選擇姓名"/></label><label>點餐截止<input type="time" value={deadline} onChange={e=>setDeadline(e.target.value)}/></label></div>
            </div>
            <p className="sync-note">♧ 已同步 {stores.length} 家店與 {stores.reduce((sum, store)=>sum+store.menu.length,0)} 個餐點</p>
            <p className="price-warning"><b>價格提醒</b>　菜單內容與價格僅供點餐參考，店家可能調整售價；實際餐點、價格及供應狀況，以店家最新公告與當日確認結果為準。</p>
          </div>
          <div className="panel order-summary">
            <div className="section-title"><div><span>02</span><h2>訂單自動統計</h2></div></div>
            {!orders.length ? <div className="empty bowl"><b>🥣</b><span>還沒有人點餐<br/>第一份美味等你加入</span></div> : orders.map(o=><div className="order-row" key={o.id}><div><b>{o.staff}</b><span>{o.item} × {o.qty}{o.note&&` · ${o.note}`}</span></div><strong>{money(o.price*o.qty)}</strong><button onClick={()=>setOrders(orders.filter(x=>x.id!==o.id))}>×</button></div>)}
            {!!orders.length && <><div className="total"><span>訂單總計</span><strong>{money(currentTotal)}</strong></div><button className="primary" onClick={closeOrder}>結單並保存紀錄</button></>}
          </div>
        </section>

        {activeStore ? <section className="order-grid">
          <div className="panel">
            <span className="tag">今日店家</span><h2>{activeStore.name}</h2>
            <div className="store-meta"><b>★ {activeStore.rating.toFixed(1)}</b><span>{activeStore.category}</span><span>{activeStore.phone||"電話待補"}</span></div>
            <p className="price-warning">菜單及價格僅供參考，實際售價與供應狀況請以店家當日公告為準。</p>
            <div className="form-grid">
              <label>同事姓名<select value={staff} onChange={e=>setStaff(e.target.value)}>{staffNames.map(n=><option key={n}>{n}</option>)}</select></label>
              <label>餐點<select value={itemId} onChange={e=>setItemId(e.target.value)}>{activeStore.menu.map(m=><option key={m.id} value={m.id}>{m.name} · NT$ {m.price}</option>)}</select></label>
              <label>數量<input type="number" min="1" value={qty} onChange={e=>setQty(Number(e.target.value))}/></label>
              <label className="wide">備註<input value={note} onChange={e=>setNote(e.target.value)} placeholder="例如：飯少、不要辣、醬另外放"/></label>
            </div>
            {!activeStore.menu.length && <button className="secondary" onClick={()=>{setTab("stores");flash("請先為店家新增菜單");}}>這間店尚無菜單，前往新增</button>}
            <button className="primary" disabled={!selectedItem} onClick={addOrder}>＋ 加入共同訂單</button>
          </div>
          <div className="panel order-summary">
            <div className="section-title"><div><span>ORDER</span><h2>今日共同訂單</h2></div><b>{orders.length} 筆</b></div>
            {!orders.length ? <div className="empty">還沒有餐點，第一位開吃吧！</div> : orders.map(o=><div className="order-row" key={o.id}><div><b>{o.staff}</b><span>{o.item} × {o.qty}{o.note&&` · ${o.note}`}</span></div><strong>{money(o.price*o.qty)}</strong><button onClick={()=>setOrders(orders.filter(x=>x.id!==o.id))}>×</button></div>)}
            <div className="total"><span>訂單總計</span><strong>{money(currentTotal)}</strong></div>
            <button className="primary" disabled={!orders.length} onClick={closeOrder}>結單並保存紀錄</button>
          </div>
        </section> : <section className="empty large">請先從上方選擇 1～8 間店家。</section>}
      </div>}

      {tab === "stores" && <div className="page">
        <section className="panel">
          <div className="section-title"><div><span>DATABASE</span><h2>店家搜尋與管理</h2></div><b>{stores.length} 間</b></div>
          <div className="search-row"><input value={searchName} onChange={e=>setSearchName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&searchStore()} placeholder="輸入店家名稱，例如：東海排骨"/><button className="primary" onClick={searchStore}>搜尋店家</button></div>
          {searchResults.map(s=><div className="search-result" key={s.id}><div><b>{s.name}</b><span>★ {s.rating} · {s.category} · {s.address||"地址待補"}</span></div><button className="primary" onClick={()=>saveSearchedStore(s)}>加入店家</button></div>)}
        </section>
        <section className="store-admin-grid">
          {stores.map(store=><article className="admin-card" key={store.id}>
            <div><span className="tag">{store.category}</span><h3>{store.name}</h3><p>★ {store.rating.toFixed(1)} · {store.meals.join("／")}</p></div>
            <div className="menu-preview">{store.menu.slice(0,4).map(m=><span key={m.id}>{m.name}<b>{money(m.price)}</b></span>)}{!store.menu.length&&<em>尚無菜單</em>}</div>
            <div className="card-actions"><button onClick={()=>addMenuItem(store.id)}>＋新增菜單</button><button className="danger" onClick={()=>deleteStore(store.id)}>刪除店家</button></div>
          </article>)}
        </section>
      </div>}

      {tab === "history" && <div className="page">
        <section className="panel"><div className="section-title"><div><span>HISTORY</span><h2>點餐紀錄</h2></div><b>{history.length} 次</b></div>
          {!history.length ? <div className="empty large">尚無結單紀錄</div> : history.map(record=><article className="history-card" key={record.id}>
            <div className="history-head"><div><h3>{record.storeName}</h3><span>結單時間：{new Date(record.closedAt).toLocaleString("zh-TW")}</span></div><strong>{money(record.total)}</strong></div>
            {record.orders.map(o=><div className="history-row" key={o.id}><span>{o.staff}</span><span>{o.item}</span><span>× {o.qty}</span><b>{money(o.price*o.qty)}</b></div>)}
          </article>)}
        </section>
      </div>}

      {tab === "settings" && <div className="page narrow">
        <section className="panel"><div className="section-title"><div><span>CONNECTION</span><h2>系統連線設定</h2></div></div>
          <label>Apps Script 部署網址<input value={apiUrl} onChange={e=>setApiUrl(e.target.value)} placeholder="https://script.google.com/macros/s/.../exec"/></label>
          <label>API_TOKEN<input type="password" value={apiToken} onChange={e=>setApiToken(e.target.value)} placeholder="請貼上 API_TOKEN"/></label>
          <p className="price-warning">金鑰只會儲存在目前瀏覽器，請勿傳送給其他人。</p>
          <button className="primary" disabled={syncing} onClick={syncStores}>{syncing?"同步中…":"驗證連線並同步店家"}</button>
        </section>
      </div>}
    </main>
  );
}
