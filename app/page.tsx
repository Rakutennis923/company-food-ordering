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

const initialStaffNames = [
  "林婉茹", "林恒儀", "林靂玄", "胡春木", "徐盛雄", "詹穗芬",
  "劉志剛", "潘禹璇", "陳光霆", "陳亞琴", "陳柏宏", "陳雅惠",
  "陳嘉儀", "鍾秀琴", "謝心瑀", "簡偉宏", "魏廉庭",
];
const money = (value: number) => new Intl.NumberFormat("zh-TW", { style: "currency", currency: "TWD", maximumFractionDigits: 0 }).format(value);
const nowLocal = () => new Date().toISOString();
const todayText = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
};
const menuGroups = (menu: MenuItem[]) => {
  const groups = new Map<string,MenuItem[]>();
  menu.forEach(item => {
    const category = item.category?.trim() || "其他";
    groups.set(category, [...(groups.get(category) || []), item]);
  });
  return [...groups.entries()].map(([category,items]) => ({category,items}));
};

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
  const [people, setPeople] = useLocalState<string[]>("food-people-v3", initialStaffNames);
  const [managementView, setManagementView] = useState<"stores"|"people">("stores");
  const [selectedIds, setSelectedIds] = useState<string[]>(seedStores.map(store => store.id));
  const [winnerId, setWinnerId] = useState("");
  const [spinning, setSpinning] = useState(false);
  const [highlightId, setHighlightId] = useState("");
  const [mealFilter, setMealFilter] = useState("全部餐期");
  const [ratingFilter, setRatingFilter] = useState(3);
  const [duty, setDuty] = useState("");
  const [deadline, setDeadline] = useState("11:20");
  const [staff, setStaff] = useState(initialStaffNames[0]);
  const [itemId, setItemId] = useState("");
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");
  const [searchName, setSearchName] = useState("");
  const [searchResults, setSearchResults] = useState<Store[]>([]);
  const [toast, setToast] = useState("");
  const [apiUrl, setApiUrl] = useLocalState("food-api-url-v3", "");
  const [apiToken, setApiToken] = useLocalState("food-api-token-v3", "");
  const [syncing, setSyncing] = useState(false);
  const [sharedStatus, setSharedStatus] = useState<"local"|"syncing"|"online"|"error">("local");
  const [isClosed, setIsClosed] = useState(false);
  const [lastSharedSync, setLastSharedSync] = useState("");
  const [bulkMenuStoreId, setBulkMenuStoreId] = useState("");
  const [bulkMenuText, setBulkMenuText] = useState("");
  const [bulkMenuErrors, setBulkMenuErrors] = useState<string[]>([]);
  const [bulkMenuSaving, setBulkMenuSaving] = useState(false);

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
  useEffect(() => {
    const sharedUrl = new URLSearchParams(window.location.search).get("api");
    if (sharedUrl && /^https:\/\/script\.google\.com\//.test(sharedUrl)) setApiUrl(sharedUrl);
  }, []);
  useEffect(() => {
    if (!apiUrl) { setSharedStatus("local"); return; }
    syncSharedState(false);
    const timer = window.setInterval(() => syncSharedState(true), 8_000);
    return () => window.clearInterval(timer);
  }, [apiUrl]);
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!orders.length) return;
      const [hours, minutes] = deadline.split(":").map(Number);
      const now = new Date();
      const cutoff = new Date();
      cutoff.setHours(hours, minutes, 0, 0);
      if (now >= cutoff && !isClosed) {
        if (apiUrl) {
          sharedApi("closeSharedOrders", {date:todayText(),meal:"中餐"})
            .then(()=>syncSharedState(false))
            .catch(error=>flash(String((error as Error).message)));
          return;
        }
        const record: ClosedOrder = {
          id: `C${Date.now()}`,
          storeName: activeStore?.name || orders[0].storeName,
          orders,
          total: currentTotal,
          closedAt: nowLocal(),
        };
        setHistory([record, ...history]);
        setOrders([]);
        flash("已到截止時間，訂單已自動結單");
      }
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [orders, deadline, history, activeStore?.name, currentTotal, apiUrl, isClosed]);

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

  async function sharedApi(action: string, data: Record<string, unknown> = {}) {
    if (!apiUrl) throw new Error("尚未設定共享同步網址");
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action, ...data }),
    });
    const result = await response.json();
    if (!result.ok) throw new Error(result.error || "共享同步失敗");
    return result;
  }

  async function syncSharedState(silent = true) {
    if (!apiUrl) return;
    try {
      if (!silent) setSharedStatus("syncing");
      const result = await sharedApi("getSharedState", {date:todayText(),meal:"中餐"});
      const state = result.state || {};
      const remoteStoreRows: Record<string,string>[] = state.stores || [];
      const remoteMenuRows: Record<string,string>[] = state.menu || [];
      if (remoteStoreRows.length) {
        const sharedStores = remoteStoreRows.map(row => {
          const storeId = String(row["店家ID"] || "");
          return {
            id: storeId,
            name: String(row["店名"] || ""),
            category: String(row["料理類型"] || "其他"),
            rating: Number(row["Google評分"] || 0),
            phone: String(row["電話"] || ""),
            address: String(row["地址"] || ""),
            meals: (["早餐","中餐","晚餐"] as const).filter(mealName => row[mealName] === "是"),
            menu: remoteMenuRows
              .filter(menuRow => String(menuRow["店家ID"] || "") === storeId)
              .map(menuRow => ({
                id: String(menuRow["菜單ID"] || ""),
                name: String(menuRow["餐點名稱"] || ""),
                price: Number(menuRow["價格"] || 0),
                category: String(menuRow["餐點分類"] || "其他"),
              })),
            active: true,
          } satisfies Store;
        }).filter(store => store.id && store.name);
        if (sharedStores.length) setStores(sharedStores);
      }
      const remotePeople: Record<string,string>[] = state.people || [];
      if (remotePeople.length) {
        const sharedPeople = remotePeople.map(row => String(row["姓名"] || "")).filter(Boolean);
        if (sharedPeople.length) {
          setPeople(sharedPeople);
          if (!sharedPeople.includes(staff)) setStaff(sharedPeople[0]);
        }
      }
      const daily = state.daily || null;
      if (daily) {
        const ids = String(daily["候選店家ID（以逗號分隔）"] || "").split(",").filter(Boolean);
        setSelectedIds(ids);
        setWinnerId(String(daily["最終中選店家ID"] || ""));
        setDuty(String(daily["值班人員"] || ""));
        setDeadline(String(daily["截止時間"] || "11:20").slice(0,5));
        setIsClosed(daily["狀態"] === "已結單");
      }
      const rows: Record<string,string>[] = state.orders || [];
      const validRows = rows.filter(row=>row["訂單狀態"]!=="已取消");
      const mapped = validRows.map(row=>({
        id: row["訂單ID"], staff: row["同事姓名"], storeId: row["店家ID"],
        storeName: row["店家名稱"], item: row["餐點名稱"], price: Number(row["單價"]||0),
        qty: Number(row["數量"]||1), note: row["備註"]||"", createdAt: row["下單時間"]||nowLocal(),
      }));
      const current = mapped.filter((_,index)=>validRows[index]?.["訂單狀態"]!=="已結單");
      setOrders(current);
      const closed = mapped.filter((_,index)=>validRows[index]?.["訂單狀態"]==="已結單");
      if (closed.length) {
        setHistory([{
          id:`REMOTE-${todayText()}`, storeName:closed[0].storeName, orders:closed,
          total:closed.reduce((sum,row)=>sum+row.price*row.qty,0),
          closedAt:String(daily?.["最後更新時間"] || nowLocal()),
        }]);
      }
      setSharedStatus("online");
      setLastSharedSync(new Date().toLocaleTimeString("zh-TW",{hour:"2-digit",minute:"2-digit",second:"2-digit"}));
    } catch (error) {
      setSharedStatus("error");
      if (!silent) flash(String((error as Error).message));
    }
  }

  async function saveSharedSelection(ids: string[], extra: Record<string,unknown> = {}) {
    if (!apiUrl) return;
    await sharedApi("saveSharedDaily", {data:{
      date:todayText(),meal:"中餐",selectedIds:ids,duty,deadline,
      winnerId:"",winnerName:"",status:"選店中",...extra,
    }});
    setIsClosed(false);
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
      const peopleResult = await api("listPeople");
      const remotePeople = (peopleResult.people || []).map((row:Record<string,string>)=>row["姓名"]).filter(Boolean);
      if (remotePeople.length) setPeople(remotePeople);
      await syncSharedState(true);
    } catch (error) { flash(String((error as Error).message)); }
    finally { setSyncing(false); }
  }

  function toggleStore(id: string) {
    if (isClosed) return flash("今日訂單已結單，請到訂餐紀錄追加");
    setWinnerId("");
    setSelectedIds(current => {
      const next = current.includes(id) ? current.filter(x => x !== id) : current.length < 8 ? [...current,id] : current;
      const directStore = next.length === 1 ? stores.find(store=>store.id===next[0]) : undefined;
      saveSharedSelection(next,directStore?{
        winnerId:directStore.id,winnerName:directStore.name,status:"開放點餐"
      }:{}).catch(error=>flash(String((error as Error).message)));
      return next;
    });
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
        const selected = stores.find(s => s.id === id);
        saveSharedSelection(selectedIds,{winnerId:id,winnerName:selected?.name||"",status:"開放點餐"})
          .then(()=>syncSharedState(true))
          .catch(error=>flash(String((error as Error).message)));
        flash(`今天吃：${stores.find(s => s.id === id)?.name}`);
      }
    }, 180);
  }

  async function addOrder() {
    if (!activeStore || !selectedItem || !staff.trim()) return flash("請先選店家、同事與餐點");
    const order: Order = {
      id: `O${Date.now()}`, staff: staff.trim(), storeId: activeStore.id, storeName: activeStore.name,
      item: selectedItem.name, price: selectedItem.price, qty: Math.max(1, qty), note: note.trim(), createdAt: nowLocal(),
    };
    if (apiUrl) {
      try {
        await sharedApi("addSharedOrder",{data:{
          date:todayText(),meal:"中餐",storeId:activeStore.id,storeName:activeStore.name,
          staff:staff.trim(),item:selectedItem.name,price:selectedItem.price,qty:Math.max(1,qty),note:note.trim(),
        }});
        await syncSharedState(true);
      } catch(error) { return flash(String((error as Error).message)); }
    } else setOrders([...orders, order]);
    setQty(1); setNote(""); flash("已加入共同訂單");
  }

  async function closeOrder() {
    if (!orders.length) return flash("目前沒有訂單");
    if (apiUrl) {
      try {
        await sharedApi("closeSharedOrders",{date:todayText(),meal:"中餐"});
        await syncSharedState(true);
        return flash("已結單並同步所有裝置");
      } catch(error) { return flash(String((error as Error).message)); }
    }
    const record: ClosedOrder = { id: `C${Date.now()}`, storeName: activeStore?.name || orders[0].storeName, orders, total: currentTotal, closedAt: nowLocal() };
    setHistory([record, ...history]); setOrders([]); flash("已結單並保存紀錄");
  }

  function addManualStore() {
    const name = prompt("店家名稱");
    if (!name?.trim()) return;
    const phone = prompt("電話（可留空）") || "";
    const address = prompt("地址（可留空）") || "";
    const rating = Number(prompt("Google 評分，例如 4.5") || 3.5);
    const category = prompt("料理類型，例如：便當、麵食、越式") || "其他";
    const store: Store = {
      id: `S${Date.now()}`, name: name.trim(), phone, address, rating,
      category, meals: ["中餐", "晚餐"], menu: [], active: true,
    };
    setStores([...stores, store]);
    flash("已手動新增店家");
  }

  function editStore(store: Store) {
    const name = prompt("店家名稱", store.name);
    if (!name?.trim()) return;
    const phone = prompt("電話", store.phone || "") ?? store.phone;
    const address = prompt("地址", store.address || "") ?? store.address;
    const rating = Number(prompt("Google 評分", String(store.rating)) || store.rating);
    const category = prompt("料理類型", store.category) || store.category;
    setStores(stores.map(item => item.id === store.id
      ? {...item, name: name.trim(), phone, address, rating, category}
      : item));
    flash("店家資料已更新");
  }

  function editMenuItem(storeId: string, menuItem: MenuItem) {
    const name = prompt("餐點名稱", menuItem.name);
    if (!name?.trim()) return;
    const price = Number(prompt("價格", String(menuItem.price)) || menuItem.price);
    setStores(stores.map(store => store.id === storeId
      ? {...store, menu: store.menu.map(item => item.id === menuItem.id ? {...item, name: name.trim(), price} : item)}
      : store));
  }

  function deleteMenuItem(storeId: string, menuId: string) {
    if (!confirm("確定刪除這個餐點？")) return;
    setStores(stores.map(store => store.id === storeId
      ? {...store, menu: store.menu.filter(item => item.id !== menuId)}
      : store));
  }

  function addPerson() {
    const name = prompt("請輸入夥伴姓名");
    if (!name?.trim() || people.includes(name.trim())) return;
    setPeople([...people, name.trim()]);
    flash("已新增夥伴");
  }

  function editPerson(oldName: string) {
    const name = prompt("修改姓名", oldName);
    if (!name?.trim()) return;
    setPeople(people.map(person => person === oldName ? name.trim() : person));
    setOrders(orders.map(order => order.staff === oldName ? {...order, staff: name.trim()} : order));
  }

  function deletePerson(name: string) {
    if (!confirm(`確定刪除「${name}」？`)) return;
    setPeople(people.filter(person => person !== name));
  }

  async function editClosedOrder(recordId: string, order: Order) {
    const staffName = prompt("訂餐姓名", order.staff);
    if (!staffName?.trim()) return;
    const item = prompt("餐點", order.item);
    if (!item?.trim()) return;
    const price = Number(prompt("單價", String(order.price)) || order.price);
    const qtyValue = Number(prompt("數量", String(order.qty)) || order.qty);
    if (apiUrl) {
      try {
        await api("updateOrder",{data:{
          "訂單ID":order.id,"同事姓名":staffName.trim(),"餐點名稱":item.trim(),
          "單價":price,"數量":Math.max(1,qtyValue),"訂單狀態":"已結單",
        }});
        await syncSharedState(true);
        return flash("訂單紀錄已同步修改並重新計價");
      } catch(error) { return flash(String((error as Error).message)); }
    }
    setHistory(history.map(record => {
      if (record.id !== recordId) return record;
      const updatedOrders = record.orders.map(row => row.id === order.id
        ? {...row, staff: staffName.trim(), item: item.trim(), price, qty: Math.max(1, qtyValue)}
        : row);
      return {...record, orders: updatedOrders, total: updatedOrders.reduce((sum, row) => sum + row.price * row.qty, 0)};
    }));
    flash("訂單紀錄已修改並重新計價");
  }

  async function addClosedOrder(record: ClosedOrder) {
    const staffName = prompt("追加訂餐姓名");
    if (!staffName?.trim()) return;
    const item = prompt("餐點");
    if (!item?.trim()) return;
    const price = Number(prompt("單價") || 0);
    const qtyValue = Math.max(1, Number(prompt("數量", "1") || 1));
    const newOrder: Order = {
      id: `O${Date.now()}`, staff: staffName.trim(), storeId: "",
      storeName: record.storeName, item: item.trim(), price, qty: qtyValue,
      note: "結單後追加", createdAt: nowLocal(),
    };
    if (apiUrl) {
      try {
        await api("appendClosedOrder",{data:{
          "日期":todayText(),"餐期":"中餐","店家名稱":record.storeName,
          "同事姓名":staffName.trim(),"餐點名稱":item.trim(),"單價":price,
          "數量":qtyValue,"備註":"結單後追加",
        }});
        await syncSharedState(true);
        return flash("已同步追加餐點並重新計價");
      } catch(error) { return flash(String((error as Error).message)); }
    }
    setHistory(history.map(itemRecord => {
      if (itemRecord.id !== record.id) return itemRecord;
      const updatedOrders = [...itemRecord.orders, newOrder];
      return {...itemRecord, orders: updatedOrders, total: updatedOrders.reduce((sum, row) => sum + row.price * row.qty, 0)};
    }));
    flash("已追加餐點並重新計價");
  }

  async function removeClosedOrder(recordId: string, orderId: string) {
    if (!confirm("確定刪除這筆餐點？")) return;
    if (apiUrl) {
      try {
        await api("deleteOrder",{orderId});
        await syncSharedState(true);
        return flash("已同步刪除並重新計價");
      } catch(error) { return flash(String((error as Error).message)); }
    }
    setHistory(history.map(record => {
      if (record.id !== recordId) return record;
      const updatedOrders = record.orders.filter(row => row.id !== orderId);
      return {...record, orders: updatedOrders, total: updatedOrders.reduce((sum, row) => sum + row.price * row.qty, 0)};
    }));
  }

  async function shareToLine(record: ClosedOrder) {
    const lines = [
      "【友成幸福團隊・訂餐確認】",
      `店家：${record.storeName}`,
      `結單時間：${new Date(record.closedAt).toLocaleString("zh-TW")}`,
      ...record.orders.map((order, index) =>
        `${index + 1}. ${order.staff}｜${order.item} × ${order.qty}｜${money(order.price * order.qty)}`),
      `總計：${money(record.total)}`,
      "請大家確認餐點，謝謝！",
    ];
    const text = lines.join("\n");
    try { await navigator.clipboard.writeText(text); } catch {}
    window.open(`https://line.me/R/msg/text/?${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
    flash("訂餐內容已複製並開啟 LINE");
  }

  async function copySharedLink() {
    if (!apiUrl) return flash("請先填入 Apps Script 部署網址");
    const url = `${window.location.origin}${window.location.pathname}?api=${encodeURIComponent(apiUrl)}`;
    await navigator.clipboard.writeText(url);
    flash("共享點餐連結已複製；連結不含 API_TOKEN");
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

  function openBulkMenu(storeId: string) {
    setBulkMenuStoreId(storeId);
    setBulkMenuText("");
    setBulkMenuErrors([]);
  }

  function closeBulkMenu() {
    if (bulkMenuSaving) return;
    setBulkMenuStoreId("");
    setBulkMenuText("");
    setBulkMenuErrors([]);
  }

  async function saveBulkMenu() {
    const store = stores.find(item => item.id === bulkMenuStoreId);
    if (!store) return;

    const parsed: {name:string; price:number; category:string; line:number}[] = [];
    const errors: string[] = [];
    let currentCategory = "其他";
    bulkMenuText.split(/\r?\n/).forEach((rawLine, index) => {
      const line = rawLine.trim();
      if (!line) return;
      const match = line.match(/^(.+?)[,，]\s*(\d+(?:\.\d+)?)\s*$/)
        || line.match(/^(.+?)\s+(\d+(?:\.\d+)?)\s*$/);
      if (match && match[1].trim() && Number(match[2]) > 0) {
        parsed.push({name:match[1].trim(), price:Number(match[2]), category:currentCategory, line:index + 1});
        return;
      }
      if (!/[0-9]/.test(line) && !/[,，]/.test(line)) {
        currentCategory = line.replace(/[：:]$/, "").trim() || "其他";
        return;
      }
      {
        errors.push(`第 ${index + 1} 行：${line}`);
      }
    });

    if (errors.length) {
      setBulkMenuErrors(errors);
      return;
    }
    if (!parsed.length) {
      setBulkMenuErrors(["請至少輸入一項餐點。"]);
      return;
    }

    const unique = new Map<string,{name:string;price:number;category:string;line:number}>();
    parsed.forEach(item => unique.set(`${item.category}\u0000${item.name}`, item));
    const rows = [...unique.values()];
    const now = Date.now();
    const menuItems: MenuItem[] = rows.map((item, index) => {
      const existing = store.menu.find(menu => menu.name.trim() === item.name);
      return {
        id: existing?.id || `M${now}-${index + 1}`,
        name: item.name,
        price: item.price,
        category: item.category,
      };
    });

    try {
      setBulkMenuSaving(true);
      if (apiUrl && apiToken) {
        for (const item of menuItems) {
          const existing = store.menu.find(menu => menu.name.trim() === item.name);
          await api("saveMenu", {data:{
            "菜單ID": existing?.id || "",
            "店家ID": store.id,
            "店名": store.name,
            "餐點分類": item.category || "其他",
            "餐點名稱": item.name,
            "價格": item.price,
            "供應狀態": "供應中",
          }});
        }
      }

      setStores(current => current.map(item => {
        if (item.id !== store.id) return item;
        const nextMenu = [...item.menu];
        menuItems.forEach(menuItem => {
          const index = nextMenu.findIndex(menu => menu.name.trim() === menuItem.name);
          if (index >= 0) nextMenu[index] = {...nextMenu[index], price:menuItem.price, category:menuItem.category};
          else nextMenu.push(menuItem);
        });
        return {...item, menu:nextMenu};
      }));
      if (apiUrl && apiToken) await syncSharedState(true);
      flash(`已一次新增／更新 ${menuItems.length} 項菜單`);
      setBulkMenuSaving(false);
      closeBulkMenu();
    } catch (error) {
      setBulkMenuErrors([String((error as Error).message)]);
    } finally {
      setBulkMenuSaving(false);
    }
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
          <button className={tab==="stores"?"active":""} onClick={()=>setTab("stores")}>♟ 管理人員</button>
          <button className={tab==="settings"?"active":""} onClick={()=>setTab("settings")}>⚙ 系統設定</button>
        </nav>
      </header>

      {toast && <div className="toast">{toast}</div>}
      <div className={`shared-indicator ${sharedStatus}`}>
        {sharedStatus==="online" ? `● 共享同步中・${lastSharedSync}` :
         sharedStatus==="syncing" ? "◌ 正在連接共享訂單…" :
         sharedStatus==="error" ? "⚠ 共享連線失敗" : "○ 本機模式（尚未連接共享訂單）"}
      </div>

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
            <button className="spin" disabled={selectedIds.length<2||spinning||isClosed} onClick={spin}>{isClosed?"今日已結單":spinning?"抽選中…":"啟動抽選"}</button>
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
              <div><label>值班人員<input value={duty} onChange={e=>setDuty(e.target.value)} onBlur={()=>saveSharedSelection(selectedIds,{duty,winnerId,winnerName:winner?.name||"",status:winnerId?"開放點餐":"選店中"}).catch(()=>{})} placeholder="選擇姓名"/></label><label>點餐截止<input type="time" value={deadline} onChange={e=>setDeadline(e.target.value)} onBlur={()=>saveSharedSelection(selectedIds,{deadline,winnerId,winnerName:winner?.name||"",status:winnerId?"開放點餐":"選店中"}).catch(()=>{})}/></label></div>
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
              <label>同事姓名<select value={staff} onChange={e=>setStaff(e.target.value)}>{people.map(n=><option key={n}>{n}</option>)}</select></label>
              <label>餐點<select value={itemId} onChange={e=>setItemId(e.target.value)}>
                {menuGroups(activeStore.menu).map(group=><optgroup key={group.category} label={group.category}>
                  {group.items.map(m=><option key={m.id} value={m.id}>{m.name} · NT$ {m.price}</option>)}
                </optgroup>)}
              </select></label>
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

      {tab === "stores" && <div className="page management-page">
        <div className="management-tabs">
          <button className={managementView==="stores"?"active":""} onClick={()=>setManagementView("stores")}>🏪 店家管理</button>
          <button className={managementView==="people"?"active":""} onClick={()=>setManagementView("people")}>👥 人員管理</button>
        </div>
        {managementView === "stores" && <>
        <section className="panel">
          <div className="section-title"><div><span>DATABASE</span><h2>店家搜尋與管理</h2></div><b>{stores.length} 間</b></div>
          <p className="management-note">可透過 Google 地圖搜尋電話、地址與評分，或直接手動建立店家。</p>
          <div className="search-row"><input value={searchName} onChange={e=>setSearchName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&searchStore()} placeholder="輸入店家名稱，例如：東海排骨"/><button className="primary" onClick={searchStore}>Google 地圖搜尋</button><button className="secondary" onClick={addManualStore}>＋手動新增</button></div>
          {searchResults.map(s=><div className="search-result" key={s.id}><div><b>{s.name}</b><span>★ {s.rating} · {s.category}</span><small>☎ {s.phone||"電話待補"}　⌖ {s.address||"地址待補"}</small></div><button className="primary" onClick={()=>saveSearchedStore(s)}>加入</button></div>)}
        </section>
        <section className="store-admin-grid">
          {stores.map(store=><article className="admin-card" key={store.id}>
            <div><span className="tag">{store.category}</span><h3>{store.name}</h3><p>★ {store.rating.toFixed(1)} · {store.meals.join("／")}</p><small>☎ {store.phone||"電話待補"}<br/>⌖ {store.address||"地址待補"}</small></div>
            <div className="menu-preview">
              {menuGroups(store.menu).map(group=><div className="menu-category" key={group.category}>
                <h4>{group.category}</h4>
                {group.items.map(m=><span key={m.id}><button className="menu-name" onClick={()=>editMenuItem(store.id,m)}>{m.name}</button><b>{money(m.price)}</b><button className="menu-delete" onClick={()=>deleteMenuItem(store.id,m.id)}>×</button></span>)}
              </div>)}
              {!store.menu.length&&<em>尚無菜單</em>}
            </div>
            <div className="card-actions"><button onClick={()=>openBulkMenu(store.id)}>＋批次新增菜單</button><button onClick={()=>editStore(store)}>修改店家</button><button className="danger" onClick={()=>deleteStore(store.id)}>刪除</button></div>
          </article>)}
        </section>
        </>}
        {managementView === "people" && <section className="panel people-panel">
          <div className="section-title"><div><span>STAFF</span><h2>夥伴名單管理</h2></div><b>{people.length} 人</b></div>
          <div className="people-toolbar"><p>名單已依姓氏筆劃由少到多排列，只保存姓名。</p><button className="primary" onClick={addPerson}>＋增加人員</button></div>
          <div className="people-grid">
            {people.map((person,index)=><article key={`${person}-${index}`}><i>{index+1}</i><b>{person}</b><div><button onClick={()=>editPerson(person)}>修改</button><button className="danger" onClick={()=>deletePerson(person)}>刪除</button></div></article>)}
          </div>
        </section>}
      </div>}

      {tab === "history" && <div className="page">
        <section className="panel"><div className="section-title"><div><span>HISTORY</span><h2>點餐紀錄</h2></div><b>{history.length} 次</b></div>
          {!history.length ? <div className="empty large">尚無結單紀錄</div> : history.map(record=><article className="history-card" key={record.id}>
            <div className="history-head"><div><h3>{record.storeName}</h3><span>結單時間：{new Date(record.closedAt).toLocaleString("zh-TW")}</span></div><div className="history-total"><strong>{money(record.total)}</strong><button onClick={()=>addClosedOrder(record)}>＋追加</button><button className="line-share" onClick={()=>shareToLine(record)}>LINE 分享</button></div></div>
            <div className="history-labels"><span>訂單時間</span><span>訂餐姓名</span><span>餐點</span><span>數量</span><span>小計</span><span>操作</span></div>
            {record.orders.map(o=><div className="history-row editable" key={o.id}><span>{new Date(o.createdAt).toLocaleString("zh-TW",{month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"})}</span><span>{o.staff}</span><span>{o.item}</span><span>× {o.qty}</span><b>{money(o.price*o.qty)}</b><div><button onClick={()=>editClosedOrder(record.id,o)}>修改</button><button className="danger" onClick={()=>removeClosedOrder(record.id,o.id)}>刪除</button></div></div>)}
          </article>)}
        </section>
      </div>}

      {tab === "settings" && <div className="page narrow">
        <section className="panel"><div className="section-title"><div><span>CONNECTION</span><h2>系統連線設定</h2></div></div>
          <label>Apps Script 部署網址<input value={apiUrl} onChange={e=>setApiUrl(e.target.value)} placeholder="https://script.google.com/macros/s/.../exec"/></label>
          <label>API_TOKEN<input type="password" value={apiToken} onChange={e=>setApiToken(e.target.value)} placeholder="請貼上 API_TOKEN"/></label>
          <p className="price-warning">金鑰只會儲存在管理者目前的瀏覽器。提供給同事的共享連結只包含 Apps Script 網址，不包含 API_TOKEN。</p>
          <button className="primary" disabled={syncing} onClick={syncStores}>{syncing?"同步中…":"驗證連線並同步店家"}</button>
          <button className="secondary" onClick={copySharedLink}>🔗 複製全員共享點餐連結</button>
        </section>
      </div>}

      {bulkMenuStoreId && <div className="modal-backdrop" role="presentation" onMouseDown={event=>event.target===event.currentTarget&&closeBulkMenu()}>
        <section className="bulk-menu-modal" role="dialog" aria-modal="true" aria-labelledby="bulk-menu-title">
          <button className="modal-close" onClick={closeBulkMenu} aria-label="關閉">×</button>
          <span className="tag">BULK MENU</span>
          <h2 id="bulk-menu-title">一次輸入全部菜單</h2>
          <p className="bulk-store-name">{stores.find(store=>store.id===bulkMenuStoreId)?.name}</p>
          <p className="bulk-help">先輸入分類標題，再逐行輸入「餐點名稱,價格」。同名餐點會更新價格，不會重複新增。</p>
          <textarea
            autoFocus
            value={bulkMenuText}
            onChange={event=>{setBulkMenuText(event.target.value);setBulkMenuErrors([]);}}
            placeholder={"麵類\n牛肉麵 小,160\n牛肉麵 大,180\n\n小菜類\n水餃,70"}
            rows={12}
          />
          <div className="format-example"><b>可接受格式</b><span>燒類（分類標題）</span><span>燒肉飯,115</span><span>燒雞排飯，120</span><span>白飯 15</span></div>
          {!!bulkMenuErrors.length && <div className="bulk-errors"><b>以下內容格式不正確：</b>{bulkMenuErrors.map(error=><span key={error}>{error}</span>)}</div>}
          <div className="modal-actions">
            <button className="secondary" onClick={closeBulkMenu} disabled={bulkMenuSaving}>取消</button>
            <button className="primary" onClick={saveBulkMenu} disabled={bulkMenuSaving}>{bulkMenuSaving?"正在儲存…":"一次儲存全部菜單"}</button>
          </div>
        </section>
      </div>}
    </main>
  );
}
