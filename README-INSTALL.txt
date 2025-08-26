# Lotto 6/45 – 자동 수집/배포 v3 (알림 + 범위수집)

## 새 기능
- **네트워크 오류 알림**
  - Slack: `${{ secrets.SLACK_WEBHOOK_URL }}` 지정 시 오류 발생 시 메시지 발송
  - Email: `MAIL_*` 시크릿 지정 시 오류 발생 시 메일 발송
- **특정 회차 범위 수집**
  - `--from`, `--to` 인자로 원하는 구간만 재수집 가능

## 설치/사용
1) 패치를 레포 루트에 풀기(덮어쓰기) 후 커밋/푸시
2) GitHub → **Actions → Deploy to GitHub Pages → Run workflow** (최초 백필 실행)
3) 이후 매주 토요일 20:35 KST 자동 실행

## 시크릿 설정(선택)
- Slack Webhook: `SLACK_WEBHOOK_URL`
- 이메일:
  - `MAIL_SERVER`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`
  - `MAIL_TO` (수신자), `MAIL_FROM` (발신자)

## 예시 실행(수동)
```bash
# 전체 또는 증분
python3 scripts/fetch_lotto.py --timeout 10 --retries 4 --retry-backoff 1.8 --sleep 0.12

# 특정 구간만 재수집(예: 601~1186)
python3 scripts/fetch_lotto.py --from 601 --to 1186
```

## 상태 파일
- `scripts/status.json` 예시:
```json
{
  "ok": false,
  "fetched": 42,
  "failed_count": 2,
  "failed_draws": [1185,1186],
  "total_after": 1234,
  "timestamp": "2025-08-27T00:00:00Z"
}
```
오류가 있으면 Slack/메일로 이 내용이 전송됩니다.
