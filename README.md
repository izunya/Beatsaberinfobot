# BeatSaberInfoBot v1.99.9

Izuna's Discord bot — Beat Saber 관련 정보 제공 봇입니다.

## Installation

```bash
npm install
```

## Start

개발용 (파일 변경 시 자동 재시작):

```bash
npm run server
```

운영용:

```bash
npm run start
```

## ENV

`.env` 파일을 프로젝트 루트에 생성하세요.

```env
TOKEN="봇 토큰"
WEBHOOKS="디스코드 웹훅 URL"
HOST="데이터베이스 호스트"
USER="데이터베이스 유저"
PORT="데이터베이스 포트"
PASSWORD="데이터베이스 비밀번호"
DATABASE="데이터베이스 이름"
```

## Stack

- discord.js v14
- PostgreSQL (`pg`)
- axios (외부 API 요청)
- node-schedule (정기 작업)
