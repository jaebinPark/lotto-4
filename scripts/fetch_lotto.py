#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import os, json, time, re, argparse, urllib.request, urllib.error, datetime
API_URL='https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo={no}'
def build_opener(proxy=None):
    h=[]; 
    if proxy: h.append(urllib.request.ProxyHandler({'http':proxy,'https':proxy}))
    return urllib.request.build_opener(*h)
def urlget(url, timeout=10, opener=None):
    req=urllib.request.Request(url, headers={'User-Agent':'Mozilla/5.0 (LottoFetcher/0.014)'})
    if opener is None: opener=build_opener()
    return opener.open(req, timeout=timeout)
def safe_int(x):
    try: return int(str(x).replace(',',''))
    except: return None
def fetch_one(no, timeout, retries, sleep_s, backoff, opener):
    d=sleep_s
    for a in range(retries+1):
        try:
            with urlget(API_URL.format(no=no), timeout=timeout, opener=opener) as r:
                j=json.loads(r.read().decode('utf-8','ignore'))
            if j and j.get('returnValue')=='success':
                nums=[j.get(f'drwtNo{i}',0) for i in range(1,7)]
                nums=sorted([n for n in nums if isinstance(n,int)])
                rec={'no':int(j.get('drwNo')), 'date':j.get('drwNoDate'),
                     'nums':nums, 'bnus':int(j.get('bnusNo') or 0),
                     'first':{'winners':safe_int(j.get('firstPrzwnerCo')), 'amount':safe_int(j.get('firstWinamnt') or j.get('firstAccumamnt'))}}
                return rec
            else:
                raise ValueError('non-success')
        except Exception:
            if a>=retries: return None
            time.sleep(d); d=min(d*backoff,6.0)
def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--timeout', type=int, default=10)
    ap.add_argument('--retries', type=int, default=4)
    ap.add_argument('--retry-backoff', type=float, default=1.8)
    ap.add_argument('--sleep', type=float, default=0.12)
    ap.add_argument('--proxy', type=str, default=None)
    ap.add_argument('--from', dest='from_no', type=int, default=None)
    ap.add_argument('--to', dest='to_no', type=int, default=None)
    a=ap.parse_args()
    opener=build_opener(a.proxy)
    repo=os.getcwd(); data_dir=os.path.join(repo,'data'); os.makedirs(data_dir, exist_ok=True)
    p=os.path.join(data_dir,'draws.json'); p50=os.path.join(data_dir,'draws50.json'); os.makedirs(os.path.dirname(p),exist_ok=True)
    cur=[]; 
    if os.path.exists(p):
        try: cur=json.load(open(p,'r',encoding='utf-8'))
        except: cur=[]
    start=a.from_no or (1 if not cur else int(cur[-1].get('no',0))+1)
    end=a.to_no or 10**9
    res=list(cur); fetched=0; no=start; consec=0
    while no<=end:
        rec=fetch_one(no,a.timeout,a.retries,a.sleep,a.retry_backoff,opener)
        if rec: res.append(rec); fetched+=1; consec=0; no+=1; time.sleep(a.sleep)
        else: consec+=1; 
        if consec>=5 and a.to_no is None: break
        if rec is None: no+=1
    res=sorted({r['no']:r for r in res if r and r.get('no')}.values(), key=lambda r:int(r['no']))
    json.dump(res, open(p,'w',encoding='utf-8'), ensure_ascii=False, indent=2)
    tail=res[-600:] if len(res)>=600 else res
    json.dump(tail, open(p50,'w',encoding='utf-8'), ensure_ascii=False, indent=2)
    status={'ok':True,'fetched':fetched,'total_after':len(res),'timestamp':datetime.datetime.utcnow().isoformat()+'Z'}
    os.makedirs('scripts', exist_ok=True)
    json.dump(status, open('scripts/status.json','w',encoding='utf-8'), ensure_ascii=False, indent=2)
    print('[OK]', len(res), 'records')
if __name__=='__main__': main()
