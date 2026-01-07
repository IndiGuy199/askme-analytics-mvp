# askme-analytics-mvp
# AskMe Analytics SaaS (server)

## Run
cp .env.example .env  # fill values
npm install
npm run dev

## Trigger
curl -X POST http://localhost:4000/api/digest/send \
  -H "Content-Type: application/json" \
  -d '{"clientId":"askme-ai"}'


  good deal............
