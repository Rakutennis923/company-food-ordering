const SHEETS = { STORES:"店家資料", MENU:"菜單與價格", DAILY:"每日訂餐設定", ORDERS:"訂餐紀錄" };

function setupSystem() {
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty("API_TOKEN")) props.setProperty("API_TOKEN", Utilities.getUuid() + Utilities.getUuid().replace(/-/g,""));
  ensureSheets();
  seedPeople();
  console.log("API_TOKEN=" + props.getProperty("API_TOKEN"));
  console.log("請另外在指令碼屬性建立 PLACES_API_KEY");
}

function doGet() {
  return output({ok:true,service:"公司訂餐系統API",time:new Date().toISOString()});
}

function doPost(e) {
  try {
    const body = JSON.parse(e?.postData?.contents || "{}");
    const publicActions = ["getSharedState","saveSharedDaily","addSharedOrder","closeSharedOrders"];
    if (!publicActions.includes(body.action)) verify(body.token);
    switch (body.action) {
      case "listStores": return output({ok:true,stores:listStores(body)});
      case "saveStore":
      case "addStore":
      case "upsertStore": return output({ok:true,store:saveStore(body.data || body.store || {})});
      case "deleteStore": return output({ok:true,store:deleteStore(body.storeId)});
      case "searchPlaces": return output({ok:true,places:searchPlaces(body.query || "")});
      case "listMenu": return output({ok:true,menu:listMenu(body)});
      case "saveMenu": return output({ok:true,item:saveMenu(body.data || {})});
      case "deleteMenu": return output({ok:true,item:deleteMenu(body.menuId)});
      case "getDaily": return output({ok:true,daily:getDaily(body)});
      case "saveDaily": return output({ok:true,daily:saveDaily(body.data || {})});
      case "listOrders": return output({ok:true,orders:listOrders(body)});
      case "addOrder": return output({ok:true,order:addOrder(body.data || {})});
      case "closeOrders": return output({ok:true,orders:closeOrders(body)});
      case "getSharedState": return output({ok:true,state:getSharedState(body)});
      case "saveSharedDaily": return output({ok:true,daily:saveSharedDaily(body.data || {})});
      case "addSharedOrder": return output({ok:true,order:addSharedOrder(body.data || {})});
      case "closeSharedOrders": return output({ok:true,state:closeSharedOrders(body)});
      case "updateOrder": return output({ok:true,order:updateOrder(body.data || {})});
      case "deleteOrder": return output({ok:true,order:deleteOrder(body.orderId)});
      case "appendClosedOrder": return output({ok:true,order:appendClosedOrder(body.data || {})});
      case "listPeople": return output({ok:true,people:listPeople()});
      case "savePerson": return output({ok:true,person:savePerson(body.data || {})});
      case "deletePerson": return output({ok:true,person:deletePerson(body.personId)});
      default: throw new Error("不支援的 action：" + body.action);
    }
  } catch (error) { return output({ok:false,error:String(error.message || error)}); }
}

function verify(token) {
  const expected = PropertiesService.getScriptProperties().getProperty("API_TOKEN");
  if (!expected || token !== expected) throw new Error("未授權");
}

function listStores(filters) {
  return objects(SHEETS.STORES).filter(row => {
    const status = String(row["啟用狀態"] || "").trim();
    if (status && status !== "啟用") return false;
    if (filters.meal && filters.meal !== "全部餐期" && row[filters.meal] !== "是") return false;
    if (filters.minRating && Number(row["Google評分"] || 0) < Number(filters.minRating)) return false;
    return true;
  });
}

function saveStore(input) {
  const sheet = getSheet(SHEETS.STORES), headers = headersOf(sheet), rows = sheet.getDataRange().getDisplayValues();
  const displayName = typeof input.displayName === "object" ? input.displayName.text : input.displayName;
  const data = Object.assign({}, input, {
    "店名": pick(input["店名"], input.name, displayName),
    "料理類型": pick(input["料理類型"], input.category, input.primaryType, "其他"),
    "早餐": yesNo(pick(input["早餐"], input.breakfast), "否"),
    "中餐": yesNo(pick(input["中餐"], input.lunch), "是"),
    "晚餐": yesNo(pick(input["晚餐"], input.dinner), "是"),
    "Google評分": pick(input["Google評分"], input.rating, ""),
    "評論數": pick(input["評論數"], input.userRatingCount, ""),
    "電話": pick(input["電話"], input.nationalPhoneNumber, ""),
    "地址": pick(input["地址"], input.formattedAddress, ""),
    "Google Maps連結": pick(input["Google Maps連結"], input.googleMapsUri, input.url, ""),
    "啟用狀態":"啟用",
    "資料來源":pick(input["資料來源"],"Google Places搜尋"),
  });
  if (!data["店名"]) throw new Error("缺少店名");
  let rowNo = -1, current = {};
  for (let i=2;i<rows.length;i++) {
    const row = rowObject(headers,rows[i]);
    if ((data["店家ID"] && row["店家ID"] === data["店家ID"]) ||
        (data["Google Maps連結"] && row["Google Maps連結"] === data["Google Maps連結"]) ||
        (row["店名"] === data["店名"] && row["地址"] === data["地址"])) {
      rowNo=i+1; current=row; break;
    }
  }
  data["店家ID"] = current["店家ID"] || data["店家ID"] || nextId(rows,headers,"店家ID","S");
  const merged=Object.assign({},current,data), values=headers.map(h=>safe(merged[h] ?? ""));
  if (rowNo>0) sheet.getRange(rowNo,1,1,headers.length).setValues([values]); else {sheet.appendRow(values);rowNo=sheet.getLastRow();}
  SpreadsheetApp.flush();
  return rowObject(headers,sheet.getRange(rowNo,1,1,headers.length).getDisplayValues()[0]);
}

function deleteStore(storeId) {
  const sheet=getSheet(SHEETS.STORES), headers=headersOf(sheet);
  const rowNo=findRow(sheet,headers.indexOf("店家ID")+1,storeId);
  if (rowNo<3) throw new Error("找不到店家");
  sheet.getRange(rowNo,headers.indexOf("啟用狀態")+1).setValue("停用");
  return {storeId:storeId,status:"停用"};
}

function searchPlaces(query) {
  if (!query) return [];
  const key=PropertiesService.getScriptProperties().getProperty("PLACES_API_KEY");
  if (!key) throw new Error("尚未設定 PLACES_API_KEY");
  const response=UrlFetchApp.fetch("https://places.googleapis.com/v1/places:searchText",{
    method:"post",contentType:"application/json",
    headers:{"X-Goog-Api-Key":key,"X-Goog-FieldMask":"places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.nationalPhoneNumber,places.googleMapsUri,places.primaryType"},
    payload:JSON.stringify({textQuery:query+" 桃園市八德區",languageCode:"zh-TW",regionCode:"TW",maxResultCount:10}),
    muteHttpExceptions:true
  });
  const result=JSON.parse(response.getContentText() || "{}");
  if (response.getResponseCode()>=300) throw new Error(result.error?.message || "Google Places搜尋失敗");
  return (result.places || []).map(p=>({
    id:p.id,name:p.displayName?.text || "",address:p.formattedAddress || "",rating:p.rating || 0,
    userRatingCount:p.userRatingCount || 0,phone:p.nationalPhoneNumber || "",url:p.googleMapsUri || "",
    category:p.primaryType || "其他"
  }));
}

function listMenu(filters) {
  return objects(SHEETS.MENU).filter(r => (!r["供應狀態"] || r["供應狀態"]==="供應中") && (!filters.storeId || r["店家ID"]===filters.storeId));
}

function saveMenu(data) {
  ["店家ID","店名","餐點名稱","價格"].forEach(f=>{if (data[f]===undefined || data[f]==="") throw new Error("缺少欄位："+f);});
  const sheet=getSheet(SHEETS.MENU), headers=headersOf(sheet), rows=sheet.getDataRange().getDisplayValues();
  data["菜單ID"]=data["菜單ID"] || nextId(rows,headers,"菜單ID","M");
  data["供應狀態"]=data["供應狀態"] || "供應中";
  data["最後確認日期"]=data["最後確認日期"] || Utilities.formatDate(new Date(),Session.getScriptTimeZone(),"yyyy-MM-dd");
  let rowNo=findRow(sheet,headers.indexOf("菜單ID")+1,data["菜單ID"]);
  const values=headers.map(h=>safe(data[h] ?? ""));
  if(rowNo>0) sheet.getRange(rowNo,1,1,headers.length).setValues([values]); else {sheet.appendRow(values);rowNo=sheet.getLastRow();}
  return rowObject(headers,sheet.getRange(rowNo,1,1,headers.length).getDisplayValues()[0]);
}

function deleteMenu(menuId) {
  const sheet=getSheet(SHEETS.MENU), headers=headersOf(sheet), rowNo=findRow(sheet,headers.indexOf("菜單ID")+1,menuId);
  if(rowNo<3) throw new Error("找不到菜單");
  sheet.getRange(rowNo,headers.indexOf("供應狀態")+1).setValue("停售");
  return {menuId:menuId,status:"停售"};
}

function getDaily(filters) {
  const date=dateText(filters.date || new Date()), meal=filters.meal || "中餐";
  return objects(SHEETS.DAILY).find(r=>dateText(r["日期"])===date && r["餐期"]===meal) || null;
}

function saveDaily(data) {
  const sheet=getSheet(SHEETS.DAILY), headers=headersOf(sheet), rows=sheet.getDataRange().getDisplayValues();
  data["候選店家數"]=String(data["候選店家ID（以逗號分隔）"] || "").split(",").filter(Boolean).length;
  data["最後更新時間"]=new Date(); data["狀態"]=data["狀態"] || "選店中";
  let rowNo=-1;
  for(let i=2;i<rows.length;i++){const r=rowObject(headers,rows[i]);if(dateText(r["日期"])===dateText(data["日期"])&&r["餐期"]===data["餐期"]){rowNo=i+1;break;}}
  const values=headers.map(h=>safe(data[h] ?? ""));
  if(rowNo>0) sheet.getRange(rowNo,1,1,headers.length).setValues([values]); else {sheet.appendRow(values);rowNo=sheet.getLastRow();}
  return rowObject(headers,sheet.getRange(rowNo,1,1,headers.length).getDisplayValues()[0]);
}

function listOrders(filters) {
  return objects(SHEETS.ORDERS).filter(r=>(!filters.date||dateText(r["日期"])===dateText(filters.date))&&(!filters.meal||r["餐期"]===filters.meal));
}

function addOrder(data) {
  const sheet=getSheet(SHEETS.ORDERS), headers=headersOf(sheet);
  data["訂單ID"]="O"+Utilities.formatDate(new Date(),Session.getScriptTimeZone(),"yyyyMMddHHmmssSSS");
  data["數量"]=Math.max(1,Number(data["數量"])||1);data["單價"]=Math.max(0,Number(data["單價"])||0);
  data["小計"]=data["數量"]*data["單價"];data["下單時間"]=new Date();data["訂單狀態"]="有效";
  sheet.appendRow(headers.map(h=>safe(data[h] ?? "")));
  return data;
}

function closeOrders(filters) {
  const sheet=getSheet(SHEETS.ORDERS), headers=headersOf(sheet), rows=sheet.getDataRange().getDisplayValues(), changed=[];
  for(let i=2;i<rows.length;i++){const r=rowObject(headers,rows[i]);if((!filters.date||dateText(r["日期"])===dateText(filters.date))&&(!filters.meal||r["餐期"]===filters.meal)&&r["訂單狀態"]!=="已取消"){sheet.getRange(i+1,headers.indexOf("訂單狀態")+1).setValue("已結單");changed.push(r["訂單ID"]);}}
  return changed;
}

function withLock(callback) {
  const lock=LockService.getScriptLock();
  lock.waitLock(10000);
  try{return callback();}finally{lock.releaseLock();}
}

function getSharedState(filters) {
  const date=dateText(filters.date || new Date()), meal=filters.meal || "中餐";
  return {
    date:date,
    meal:meal,
    stores:listStores({}),
    menu:listMenu({}),
    people:listPeople(),
    daily:getDaily({date:date,meal:meal}),
    orders:listOrders({date:date,meal:meal}),
    serverTime:new Date().toISOString()
  };
}

function saveSharedDaily(input) {
  return withLock(function(){
    const date=dateText(input.date || input["日期"] || new Date());
    const meal=input.meal || input["餐期"] || "中餐";
    const existing=getDaily({date:date,meal:meal}) || {};
    const data=Object.assign({},existing,{
      "日期":date,
      "餐期":meal,
      "值班人員":pick(input.duty,input["值班人員"],existing["值班人員"],""),
      "候選店家ID（以逗號分隔）":Array.isArray(input.selectedIds)?input.selectedIds.join(","):pick(input["候選店家ID（以逗號分隔）"],existing["候選店家ID（以逗號分隔）"],""),
      "截止時間":pick(input.deadline,input["截止時間"],existing["截止時間"],"11:20"),
      "最終中選店家ID":input.winnerId !== undefined ? input.winnerId : pick(input["最終中選店家ID"],existing["最終中選店家ID"],""),
      "最終中選店家":input.winnerName !== undefined ? input.winnerName : pick(input["最終中選店家"],existing["最終中選店家"],""),
      "狀態":pick(input.status,input["狀態"],existing["狀態"],"選店中")
    });
    return saveDaily(data);
  });
}

function addSharedOrder(input) {
  return withLock(function(){
    const date=dateText(input.date || input["日期"] || new Date());
    const meal=input.meal || input["餐期"] || "中餐";
    const daily=getDaily({date:date,meal:meal});
    if(!daily) throw new Error("今日尚未建立選店結果");
    if(daily["狀態"]==="已結單") throw new Error("今日訂單已結單，請到訂餐紀錄追加");
    return addOrder({
      "日期":date,"餐期":meal,
      "店家ID":pick(input.storeId,input["店家ID"],daily["最終中選店家ID"]),
      "店家名稱":pick(input.storeName,input["店家名稱"],daily["最終中選店家"]),
      "同事姓名":pick(input.staff,input["同事姓名"]),
      "餐點名稱":pick(input.item,input["餐點名稱"]),
      "單價":pick(input.price,input["單價"],0),
      "數量":pick(input.qty,input["數量"],1),
      "備註":pick(input.note,input["備註"],"")
    });
  });
}

function closeSharedOrders(filters) {
  return withLock(function(){
    const date=dateText(filters.date || new Date()), meal=filters.meal || "中餐";
    const changed=closeOrders({date:date,meal:meal});
    const daily=getDaily({date:date,meal:meal});
    if(daily) {
      daily["狀態"]="已結單";
      daily["備註"]="結單時間："+Utilities.formatDate(new Date(),Session.getScriptTimeZone(),"yyyy-MM-dd HH:mm:ss");
      saveDaily(daily);
    }
    return {closedOrderIds:changed,daily:getDaily({date:date,meal:meal})};
  });
}

function updateOrder(data) {
  return withLock(function(){
    const sheet=getSheet(SHEETS.ORDERS), headers=headersOf(sheet);
    const rowNo=findRow(sheet,headers.indexOf("訂單ID")+1,data["訂單ID"]);
    if(rowNo<3) throw new Error("找不到訂單");
    const current=rowObject(headers,sheet.getRange(rowNo,1,1,headers.length).getDisplayValues()[0]);
    const merged=Object.assign({},current,data);
    merged["數量"]=Math.max(1,Number(merged["數量"])||1);
    merged["單價"]=Math.max(0,Number(merged["單價"])||0);
    merged["小計"]=merged["數量"]*merged["單價"];
    merged["異動記錄"]="最後修改："+Utilities.formatDate(new Date(),Session.getScriptTimeZone(),"yyyy-MM-dd HH:mm:ss");
    sheet.getRange(rowNo,1,1,headers.length).setValues([headers.map(h=>safe(merged[h] ?? ""))]);
    return merged;
  });
}

function deleteOrder(orderId) {
  return updateOrder({"訂單ID":orderId,"訂單狀態":"已取消"});
}

function appendClosedOrder(data) {
  const order=addOrder(data);
  return updateOrder({"訂單ID":order["訂單ID"],"訂單狀態":"已結單","異動記錄":"結單後追加"});
}

function listPeople() {
  return objects("人員資料").filter(r=>!r["狀態"] || r["狀態"]==="啟用");
}

function savePerson(data) {
  const sheet=getSheet("人員資料"),headers=headersOf(sheet),rows=sheet.getDataRange().getDisplayValues();
  if(!data["姓名"]) throw new Error("缺少姓名");
  data["人員ID"]=data["人員ID"] || nextId(rows,headers,"人員ID","P");
  data["狀態"]="啟用";
  let rowNo=findRow(sheet,headers.indexOf("人員ID")+1,data["人員ID"]);
  if(rowNo<3) {
    for(let i=2;i<rows.length;i++) if(rowObject(headers,rows[i])["姓名"]===data["姓名"]) {rowNo=i+1;break;}
  }
  const values=headers.map(h=>safe(data[h] ?? ""));
  if(rowNo>0) sheet.getRange(rowNo,1,1,headers.length).setValues([values]); else sheet.appendRow(values);
  return data;
}

function deletePerson(personId) {
  const sheet=getSheet("人員資料"),headers=headersOf(sheet),rowNo=findRow(sheet,headers.indexOf("人員ID")+1,personId);
  if(rowNo<3) throw new Error("找不到人員");
  sheet.getRange(rowNo,headers.indexOf("狀態")+1).setValue("停用");
  return {personId:personId,status:"停用"};
}

function ensureSheets() {
  const defs={
    "店家資料":["店家ID","店名","料理類型","早餐","中餐","晚餐","Google評分","評論數","電話","地址","距離(公尺)","Google Maps連結","啟用狀態","菜單確認日期","資料來源","備註"],
    "菜單與價格":["菜單ID","店家ID","店名","餐點分類","餐點名稱","價格","供應狀態","可選項／加料","最後確認日期","確認人","菜單來源／網址","備註"],
    "每日訂餐設定":["日期","餐期","值班人員","候選店家ID（以逗號分隔）","候選店家數","截止時間","最終中選店家ID","最終中選店家","狀態","最後更新時間","備註"],
    "訂餐紀錄":["訂單ID","日期","餐期","店家ID","店家名稱","同事姓名","餐點名稱","單價","數量","小計","備註","下單時間","訂單狀態","異動記錄"],
    "人員資料":["人員ID","姓名","狀態","備註"]
  };
  const ss=SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(defs).forEach(name=>{
    let s=ss.getSheetByName(name);if(!s)s=ss.insertSheet(name);
    if(s.getLastRow()<2){s.getRange(2,1,1,defs[name].length).setValues([defs[name]]);s.getRange(2,1,1,defs[name].length).setFontWeight("bold");}
    else {
      const current=s.getRange(2,1,1,s.getLastColumn()).getDisplayValues()[0];
      defs[name].forEach(header=>{if(!current.includes(header)){s.getRange(2,s.getLastColumn()+1).setValue(header);}});
    }
  });
}

function seedPeople() {
  const names=["林婉茹","林恒儀","林靂玄","胡春木","徐盛雄","詹穗芬","劉志剛","潘禹璇","陳光霆","陳亞琴","陳柏宏","陳雅惠","陳嘉儀","鍾秀琴","謝心瑀","簡偉宏","魏廉庭"];
  const sheet=getSheet("人員資料");
  if(objects("人員資料").length) return;
  const headers=headersOf(sheet);
  names.forEach((name,index)=>sheet.appendRow(headers.map(h=>safe({
    "人員ID":"P"+Utilities.formatString("%03d",index+1),
    "姓名":name,
    "狀態":"啟用",
    "備註":"依姓氏筆劃排序"
  }[h] || ""))));
}

function objects(name){const s=getSheet(name),v=s.getDataRange().getDisplayValues();if(v.length<3)return[];const h=v[1];return v.slice(2).filter(r=>r.some(x=>String(x).trim())).map(r=>rowObject(h,r));}
function getSheet(name){const s=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);if(!s)throw new Error("找不到工作表："+name);return s;}
function headersOf(s){return s.getRange(2,1,1,s.getLastColumn()).getDisplayValues()[0];}
function rowObject(h,r){return h.reduce((o,k,i)=>(o[k]=r[i]??"",o),{});}
function findRow(s,c,value){if(c<1||s.getLastRow()<3)return-1;const v=s.getRange(3,c,s.getLastRow()-2,1).getDisplayValues();const i=v.findIndex(r=>String(r[0])===String(value));return i<0?-1:i+3;}
function pick(){for(let i=0;i<arguments.length;i++)if(arguments[i]!==undefined&&arguments[i]!==null&&String(arguments[i]).trim()!=="")return arguments[i];return"";}
function yesNo(v,f){const x=String(v||"").toLowerCase();if(["是","yes","true","1"].includes(x))return"是";if(["否","no","false","0"].includes(x))return"否";return f;}
function nextId(rows,h,key,prefix){let max=0;for(let i=2;i<rows.length;i++){const m=String(rowObject(h,rows[i])[key]||"").match(new RegExp("^"+prefix+"(\\d+)$","i"));if(m)max=Math.max(max,Number(m[1]));}return prefix+Utilities.formatString("%03d",max+1);}
function dateText(v){const d=v instanceof Date?v:new Date(v);return isNaN(d.getTime())?String(v).trim():Utilities.formatDate(d,Session.getScriptTimeZone(),"yyyy-MM-dd");}
function safe(v){return typeof v==="string"&&/^[=+\-@]/.test(v)?"'"+v:v;}
function output(data){return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);}
