#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
동행복권 로또 6/45 수집 스크립트 (정식)
- 최초 백필 및 증분 갱신
- 안정화: timeout / retries / backoff / sleep / proxy
- 특정 범위 수집 (--from, --to)
- 1~3등 금액/당첨인원 병합
- 상태 파일 저장 (scripts/status.json)
"""
import os, sys, json, time, datetime, urllib.request, urllib.error, re, argparse

API_URL = "https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo={no}"
BYWIN_URL = "https://www.dhlottery.co.kr/gameResult.do?method=byWin&drwNo={no}"

def build_opener(proxy:str=None):
    handlers = []
    if proxy:
        handlers.append(urllib.request.ProxyHandler({'http': proxy, 'https': proxy}))
    return urllib.request.build_opener(*handlers)

def urlget(url, timeout=10, opener=None):
    req = urllib.request.Request(url, headers={
        "User-Agent": "Mozilla/5.0 (compatible; LottoFetcher/1.0)"
    })
    if opener is None:
        opener = build_opener()
    return opener.open(req, timeout=timeout)

def safe_int(x):
    try: return int(str(x).replace(",",""))
    except: return None

def parse_amount(s:str):
    if not s: return None
    s = re.sub(r"[^\d]", "", s)
    return int(s) if s.isdigit() else None

def fetch_json(no:int, timeout:int, retries:int, sleep:float, backoff:float, opener):
    delay = sleep
    for attempt in range(retries+1):
        try:
            with urlget(API_URL.format(no=no), timeout=timeout, opener=opener) as r:
                data = json.loads(r.read().decode('utf-8', errors='ignore'))
            if data and data.get('returnValue') == 'success':
                nums = [data.get(f'drwtNo{i}', 0) for i in range(1,7)]
                nums = sorted([n for n in nums if isinstance(n, int)])
                rec = {
                    "no": int(data.get("drwNo")),
                    "date": data.get("drwNoDate"),
                    "nums": nums,
                    "bnus": int(data.get("bnusNo") or 0),
                    "first": {
                        "winners": safe_int(data.get("firstPrzwnerCo")),
                        "amount": safe_int(data.get("firstWinamnt") or data.get("firstAccumamnt"))
                    }
                }
                return rec
        except Exception:
            if attempt >= retries: return None
            time.sleep(delay); delay *= backoff
    return None

def fetch_bywin_top3(no:int, timeout:int, retries:int, sleep:float, backoff:float, opener):
    delay = sleep
    for attempt in range(retries+1):
        try:
            with urlget(BYWIN_URL.format(no=no), timeout=timeout, opener=opener) as r:
                html = r.read().decode('utf-8', errors='ignore')
            rows = re.findall(r"<tr[^>]*>(.*?)</tr>", html, re.S|re.I)
            info = {}
            for row in rows:
                if re.search(r">1\s*등<", row): info['1'] = row
                elif re.search(r">2\s*등<", row): info['2'] = row
                elif re.search(r">3\s*등<", row): info['3'] = row
            def extract(row):
                if not row: return {"winners": None, "amount": None}
                nums = re.findall(r"([\d,]+)", row)
                m_money = re.search(r"([\d,]+)\s*원", row)
                amount = parse_amount(m_money.group(1)) if m_money else (parse_amount(nums[-1]) if nums else None)
                m_win = re.search(r"([\d,]+)\s*명", row)
                winners = safe_int(m_win.group(1)) if m_win else (safe_int(nums[0]) if nums else None)
                return {"winners": winners, "amount": amount}
            return {"1":extract(info.get('1')),"2":extract(info.get('2')),"3":extract(info.get('3'))}
        except Exception:
            if attempt >= retries:
                return {"1":{"winners":None,"amount":None},"2":{"winners":None,"amount":None},"3":{"winners":None,"amount":None}}
            time.sleep(delay); delay *= backoff
    return {"1":{"winners":None,"amount":None},"2":{"winners":None,"amount":None},"3":{"winners":None,"amount":None}}

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--timeout", type=int, default=10)
    ap.add_argument("--retries", type=int, default=4)
    ap.add_argument("--retry-backoff", type=float, default=1.8)
    ap.add_argument("--sleep", type=float, default=0.12)
    ap.add_argument("--proxy", type=str, default=None)
    ap.add_argument("--from", dest="from_no", type=int, default=None)
    ap.add_argument("--to", dest="to_no", type=int, default=None)
    args = ap.parse_args()

    opener = build_opener(args.proxy)
    repo_root = os.getcwd()
    data_dir = os.path.join(repo_root, "data"); os.makedirs(data_dir, exist_ok=True)
    draws_path = os.path.join(data_dir, "draws.json")
    draws50_path = os.path.join(data_dir, "draws50.json")
    status_path = os.path.join(repo_root, "scripts", "status.json")
    os.makedirs(os.path.dirname(status_path), exist_ok=True)

    current = []
    if os.path.exists(draws_path):
        try: current = json.load(open(draws_path,"r",encoding="utf-8"))
        except: current = []

    start_no = args.from_no or (1 if not current else int(current[-1].get("no",0))+1)
    end_no = args.to_no or 10**9

    results = list(current)
    failed, fetched_count = [], 0
    no, consecutive_fail, max_fail = start_no, 0, 5

    while no <= end_no:
        rec = fetch_json(no,args.timeout,args.retries,args.sleep,args.retry_backoff,opener)
        if rec:
            top3 = fetch_bywin_top3(no,args.timeout,args.retries,args.sleep,args.retry_backoff,opener)
            if top3:
                rec["second"], rec["third"] = top3.get("2"), top3.get("3")
                fpage = top3.get("1")
                if fpage:
                    rec["first"]["winners"] = rec["first"]["winners"] or fpage.get("winners")
                    rec["first"]["amount"]  = rec["first"]["amount"]  or fpage.get("amount")
            results.append(rec)
            fetched_count += 1; consecutive_fail=0; no+=1; time.sleep(args.sleep)
        else:
            failed.append(no); consecutive_fail+=1
            if consecutive_fail>=max_fail and args.to_no is None: break
            no+=1; time.sleep(max(args.sleep/2,0.05))

    results = sorted({r["no"]:r for r in results if r and r.get("no")}.values(), key=lambda r:int(r["no"]))
    json.dump(results, open(draws_path,"w",encoding="utf-8"), ensure_ascii=False, indent=2)
    tail = results[-600:] if len(results)>=600 else results
    json.dump(tail, open(draws50_path,"w",encoding="utf-8"), ensure_ascii=False, indent=2)

    status = {"ok": len(failed)==0,"fetched":fetched_count,"failed_count":len(failed),
              "failed_draws":failed,"total_after":len(results),
              "timestamp": datetime.datetime.utcnow().isoformat()+"Z"}
    json.dump(status, open(status_path,"w",encoding="utf-8"), ensure_ascii=False, indent=2)
    print(f"[OK] draws.json: {len(results)} entries; fetched {fetched_count}, failed {len(failed)}")

if __name__=="__main__": main()
