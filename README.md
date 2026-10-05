# 누리디에스엠

오늘 나갈 택배를, 사무실 화면과 관리자 화면에서 같이 봐요.

업체와 택배사만 등록해 두면 홈에서 고르고, TV는 6자리 코드로 붙여요.

## 이런 일을 해요

* 날짜별 발송 보드 (선불·착불, 퀵은 출발 시간)
* 업체·택배사 관리, 초대받은 관리자
* 65인치 TV용 디스플레이 (`/display`)
* 국가 공휴일 불러오기, 직접 쉬는 날 넣기
* 작업·로그인 기록 (소유자만)

## 기술 스택

<p>
  <img src="https://skillicons.dev/icons?i=vue,vite,nestjs,postgres,redis,nodejs,pnpm,docker,nginx,ts" alt="Vue, Vite, NestJS, PostgreSQL, Redis, Node.js, pnpm, Docker, Nginx, TypeScript" />
</p>

| 구분 | 선택 |
| --- | --- |
| 모노레포 | Turborepo + pnpm 11 |
| 관리자 · TV | Vue 3 + Vite |
| API | NestJS 11, Drizzle, JWT 쿠키 |
| 데이터 | PostgreSQL 16, Redis 7 |
| 실시간 | SSE (`/api/events`) |
| 문서 | OpenAPI + Scalar (`/api/docs`) |
| 배포 | GitHub Actions → GHCR → Docker Compose |

프론트는 `/api` 상대 경로만 써요. 빌드할 때 API 주소를 넣지 않아도 돼요.

## 프로젝트 구조

세 개의 앱과 공유 패키지를 한 저장소에서 관리해요.

```text
apps/
├── admin/       # 관리자 Vue (port 5173)
├── dashboard/   # TV 디스플레이 Vue (port 5174, base /display/)
└── api/         # NestJS (port 3000)

packages/
├── shared/      # 날짜·결제·퀵발송·SSE 계약
└── ui/          # 글자 맞춤, 토큰

deploy/
├── nginx.conf       # 컨테이너 입구. /api · /display · 관리자를 나눠요
└── nginx.host.conf  # 호스트 nginx가 8083으로만 넘길 때
```

Nest는 `packages/shared`의 CJS `dist`를, Vite는 TypeScript 소스를 봐요.

## 시작하기 전에

아래만 있으면 돼요.

* Node.js 22
* pnpm 11 (이 저장소는 `packageManager`로 11.5.2를 지정해요)
* Docker (로컬 PostgreSQL · Redis)

pnpm은 Corepack을 켠 뒤 쓰는 걸 추천해요.

```bash
corepack enable
```

## 시작하기

### 1) 패키지를 설치해요

저장소 루트에서 한 번만 실행하면 돼요.

```bash
pnpm install
```

### 2) 환경 변수를 준비해요

루트 `.env` 하나를 관리자 · TV · API가 같이 봐요.

macOS · Linux

```bash
cp .env.example .env
```

Windows

```bash
copy .env.example .env
```

그대로 띄워도 로컬은 돌아가요. 다만 `JWT_SECRET`은 **32자 이상**이어야 해요. 짧으면 API가 꺼져요. 기본값 `dev-secret`은 없어요.

처음 관리자 계정을 만들려면 `.env`에 이메일이랑 비밀번호를 넣어 주세요.

```dotenv
BOOTSTRAP_ADMIN_EMAIL=you@mulumpyo.com
BOOTSTRAP_ADMIN_PASSWORD=여덟자이상1
```

이미 비밀번호가 있는 계정은 덮어쓰지 않아요.

### 3) 데이터베이스를 켜요

앱은 호스트에서 띄우고, Docker로는 PostgreSQL이랑 Redis만 켜요. 서버의 3000 · 5173과는 겹치지 않게 **15432** / **16379**를 `127.0.0.1`에만 열어요.

```bash
docker compose -f compose.yaml up -d
pnpm --filter @nuri/api db:migrate
pnpm --filter @nuri/api db:seed
```

시드는 택배사 기본값을 넣어요. 이미 있으면 건너뛰어요.

### 4) 개발 서버를 켜요

```bash
pnpm dev
```

관리자 · 디스플레이 · API가 같이 떠요.

| 서비스 | 주소 |
| --- | --- |
| 관리자 | http://localhost:5173 |
| 디스플레이 | http://localhost:5174/display/ |
| API | http://localhost:3000/api/health/ready |
| OpenAPI | http://localhost:3000/api/docs |

슬래시 없는 `/display` 도 `/display/` 로 보내 드려요.

로그만 보고 싶으면 `@nuri/api#dev` 처럼 해당 태스크를 고르면 돼요.

앱을 따로 켤 수도 있어요.

```bash
pnpm --filter @nuri/api dev
pnpm --filter @nuri/admin dev
pnpm --filter @nuri/dashboard dev
```

## 환경 변수

루트 `.env` 하나예요. 자세한 주석은 `.env.example`에 있어요.

로컬 기본값은 아래와 같아요.

```dotenv
DATABASE_URL=postgres://nuri:nuri@localhost:15432/nuri
REDIS_URL=redis://localhost:16379
JWT_SECRET=change-me-in-production-use-32plus
PUBLIC_ORIGIN=http://localhost:5173
COOKIE_SECURE=false
PORT=3000
TZ=Asia/Seoul
```

| 변수 | 역할 | 로컬 기본 |
| --- | --- | --- |
| `DATABASE_URL` | PostgreSQL | `localhost:15432` |
| `REDIS_URL` | Redis | `localhost:16379` |
| `JWT_SECRET` | 쿠키 서명. **32자 이상** | 예시 문자열 |
| `PUBLIC_ORIGIN` | 초대·복구 메일 링크의 앞부분 | `http://localhost:5173` |
| `COOKIE_SECURE` | HTTPS면 `true` | `false` |
| `BOOTSTRAP_ADMIN_EMAIL` | 처음 만들 관리자 | 비우면 안 만들어요 |
| `BOOTSTRAP_ADMIN_PASSWORD` | 8자 이상, 문자+숫자 | — |
| `SMTP_*` `SMTP_FROM` | 초대·복구 메일. 있으면 이걸 먼저 써요 | 카카오 SMTP 예시 |
| `RESEND_API_KEY` | SMTP가 없을 때만 | — |
| `DATA_GO_KR_SERVICE_KEY` | 특일정보. 없으면 불러오기가 실패로 보여요 | — |
| `TOTP_ISSUER` | 인증 앱에 보이는 이름 | 누리디에스엠 |
| `DOCS_ENABLED` | 프로덕션에서 `/api/docs`를 열 때 `true` | 로컬은 기본 켜짐 |
| `VITE_PUBLIC_HOST` | 호스트 nginx 뒤에서 Vite HMR을 붙일 때만 | 없어도 로컬은 돼요 |
| `NURI_HTTP_PORT` | 배포 컨테이너 입구. **서버에서만** | `8083` |

배포 `JWT_SECRET`은 새로 만들어 주세요. **erd-studio와 절대 공유하지 마세요.**

프로덕션에서 SMTP도 Resend도 없으면 초대 메일이 실패해요. 로컬은 콘솔에 링크를 남겨 드려요.

## 자주 쓰는 명령어

```bash
pnpm dev          # 관리자 · TV · API
pnpm build        # 전체 빌드
pnpm typecheck    # 타입 검사
pnpm test         # 단위 테스트
pnpm test:e2e     # API e2e (DB · Redis가 있을 때)
```

데이터베이스예요.

```bash
docker compose -f compose.yaml up -d
docker compose -f compose.yaml down
pnpm db:migrate    # SQL 마이그레이션
pnpm db:seed       # 기본 택배사
pnpm db:generate   # Drizzle 생성 (스키마를 바꿀 때)
```

## API

`apps/api` 는 Controller → Service → Repository 순서로 읽으면 편해요.

```text
apps/api/src/
├── auth/         # 로그인 · 초대 · 계정 · 쿠키
├── shipments/    # 발송 보드
├── companies/
├── carriers/
├── devices/      # TV 6자리 연결
├── holidays/     # 쉬는 날 · 특일정보
├── events/       # SSE
└── common/       # OpenAPI, 작업 로그
```

알아 두면 좋은 약속이에요.

* 인증은 HttpOnly 쿠키 `access`(12시간) · `refresh` 예요. SameSite는 Lax예요.
* 에러는 `code`와 한글 `message`로 와요.
* 화면 기기는 `@AllowDevice()`가 있는 길만 들어와요.
* 계정·로그 API는 소유자(또는 부트스트랩 이메일)만 볼 수 있어요.
* OpenAPI는 로컬에서 `/api/docs` 예요. 배포는 `DOCS_ENABLED=true`일 때만 열려요.
* 새 길을 만들면 `operationId` · 한글 요약 · DTO `@ApiProperty`를 같이 적어 주세요. `OPENAPI_OPS`에도 이름을 넣어야 e2e가 통과해요.

## 관리자 · TV

관리자는 `apps/admin`, TV는 `apps/dashboard` 예요.

로컬에서는 Vite가 `/api`를 Nest로 넘겨 줘서 CORS를 신경 쓰지 않아도 돼요.

고칠 때 먼저 여는 파일이에요.

| 하고 싶은 일 | 파일 |
| --- | --- |
| 홈 보드 | `HomeBoard.vue` · `use-home-board.ts` · `HomeDock.vue` |
| 업체 · 택배사 목록 | `DirPage.vue` · `use-dir-page.ts` |
| 설정 · 화면 연결 | `SettingsView.vue` · `use-home-settings.ts` |
| 로그인 가드 | `router/access.ts` · `lib/session.ts` |
| 토스트 · 확인 | `lib/chrome.ts` |
| TV 연결 · 보드 | `PairScreen.vue` · `BoardScreen.vue` · `use-display.ts` |
| 스타일 | `styles/{chrome,cal,dialog,home,dir,auth,settings}.css` |

제품에서 일부러 이렇게 둔 동작이에요. 버그로 고치지 말아 주세요.

* 로그아웃은 확인 창이 없어요
* 페어링 코드는 6자리예요
* 세션은 약 12시간이에요
* 캘린더 **내일**은 한국 시간 기준 오늘 + 1일이에요
* 초대받은 관리자는 `/accounts`, `/settings/logs`를 볼 수 없어요

## 테스트

```bash
pnpm test
pnpm --filter @nuri/api test:e2e
```

e2e는 `.env`의 `DATABASE_URL` · `REDIS_URL`이 있을 때만 돌아요. CI는 워크플로가 Postgres · Redis를 붙여 줘요.

## 배포

`deploy` 브랜치에 푸시하거나 Actions에서 직접 실행하면 돼요.

서버는 **erd-studio와 같은** Ubuntu 24.04 Oracle ARM(`aarch64`) 이에요. 이미지는 `linux/arm64`로 만들고, 호스트 포트는 **8083**만 열어서 8082/3001/3030과 겹치지 않아요.

1. 타입 검사 · 단위 테스트 · 마이그레이션 · e2e · 빌드
2. `api` · `admin` · `dashboard` 이미지를 `linux/arm64`로 GHCR에 올려요 (`target: prod`)
3. 서버 `/home/ubuntu/nuri-dashboard`에 `compose.prod.yaml`과 `deploy/nginx.conf`를 복사해요
4. GitHub Secrets로 `.env`를 다시 쓰고, 컨테이너를 띄워요
5. `http://127.0.0.1:8083/api/health/ready` 가 200이면 끝나요. 첫 기동은 DB 초기화 때문에 최대 3분 기다려요.

`main`은 개발용이에요. 배포와 나눠 두었어요.

```text
https://nuri.mulumpyo.com
├─ /            → 관리자     (컨테이너 nuri-admin)
├─ /display/    → TV        (컨테이너 nuri-tv)
└─ /api         → Nest      (컨테이너 nuri-api)
```

호스트 nginx는 **전체를 `127.0.0.1:8083`으로만** 넘기면 돼요. `/display`와 `/api`는 컨테이너 nginx가 나눠요.

같은 서버에 joyang(3000 · 5173)이랑 erd-studio(8082)가 있어서, 누리는 API · DB · Redis를 호스트에 열지 않아요. 네트워크 이름은 `nuri-dashboard`, 컨테이너는 `nuri-api` · `nuri-admin` · `nuri-tv` · `nuri-postgres` · `nuri-redis` · `nuri-nginx` · `nuri-backup` 이에요.

API가 뜰 때 `pnpm db:migrate`를 먼저 돌려요. 쉬는 날 키(`DATA_GO_KR_SERVICE_KEY`)가 없으면 불러오기만 실패로 보여요. 보드는 그대로예요.

### GitHub Secrets

필수예요.

| 이름 | 역할 |
| --- | --- |
| `SSH_HOST` `SSH_USER` `SSH_KEY` | 배포 서버 |
| `JWT_SECRET` | 32자 이상. erd-studio와 다른 값 |
| `POSTGRES_PASSWORD` | 누리 DB 비밀번호 |

선택이에요.

| 이름 | 역할 |
| --- | --- |
| `SSH_PORT` | 22가 아닐 때만 |
| `SMTP_HOST` `SMTP_PORT` `SMTP_USER` `SMTP_PASS` `SMTP_SECURE` `SMTP_FROM` | 초대·복구 메일 |
| `RESEND_API_KEY` | SMTP가 없을 때 |
| `BOOTSTRAP_ADMIN_EMAIL` `BOOTSTRAP_ADMIN_PASSWORD` | 첫 관리자 |
| `DATA_GO_KR_SERVICE_KEY` | 특일정보 |

`GITHUB_TOKEN`은 GitHub이 넣어 줘요. 직접 등록하지 않아도 돼요.

`DATABASE_URL` 시크릿은 쓰지 않아요. 워크플로가 항상 `nuri-postgres` 컨테이너를 가리켜요. 다른 프로젝트 DB에 붙지 않게 하려는 거예요.

### 호스트 nginx

서버에서 처음 한 번만 하면 돼요. TLS는 호스트에 있는 인증서를 그대로 쓰면 돼요.

<details>
<summary><code>/etc/nginx/sites-available/nuri</code></summary>

```nginx
server {
    listen 80;
    server_name nuri.mulumpyo.com;
    return 301 https://nuri.mulumpyo.com$request_uri;
}

server {
    listen 443 ssl;
    server_name nuri.mulumpyo.com;

    ssl_certificate /etc/letsencrypt/live/nuri.mulumpyo.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/nuri.mulumpyo.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    location /api/events {
        proxy_pass http://127.0.0.1:8083;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Connection "";
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 3600s;
    }

    location / {
        proxy_pass http://127.0.0.1:8083;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

</details>

```bash
sudo nano /etc/nginx/sites-available/nuri
sudo ln -sf /etc/nginx/sites-available/nuri /etc/nginx/sites-enabled/nuri
sudo nginx -t
sudo systemctl reload nginx
```

경로만 넣을 때는 `deploy/nginx.host.conf`를 기존 서버 블록에 붙여도 돼요.

### 배포가 됐는지 봐요

```bash
cd /home/ubuntu/nuri-dashboard
docker compose -p nuri-dashboard -f compose.prod.yaml ps
docker compose -p nuri-dashboard -f compose.prod.yaml logs api --tail 50
curl -sS http://127.0.0.1:8083/api/health/ready
curl -sSI https://nuri.mulumpyo.com/display
```

`/display` 는 `308` 으로 `/display/` 를 가리켜야 해요. HTML에 `@vite/client`가 있으면 아직 `pnpm dev`예요. 공식 이미지가 아니에요.

백업 컨테이너가 한국 날짜로 하루에 한 번 덤프하고, 14일만 남겨 둬요.

```bash
docker compose -p nuri-dashboard -f compose.prod.yaml exec backup ls -l /backups
```

복구할 때는 덮어쓰니 한 번 더 확인한 뒤에 해 주세요.

```bash
docker compose -p nuri-dashboard -f compose.prod.yaml exec backup \
  pg_restore --clean --if-exists -h nuri-postgres -U nuri -d nuri \
  /backups/nuri-YYYY-MM-DD.dump
```
