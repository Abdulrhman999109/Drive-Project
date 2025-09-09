# Blobs API

Simple API to store and get files (blobs).  
Supports local, database, S3, and FTP backends.  
All routes need JWT token.

---

## Run
```bash
npm install
cp .env.example .env
npx prisma migrate dev --name init
npm run dev
```
If you use Docker for MinIO / FTP, you must create and configure the containers manually before starting the server.
I used pgAdmin to manage Postgres.

# Token
Generate a token:

```bash

npm run getToken
```
# API
POST /v1/blobs
Upload a new blob.

Body example:

```json

{
  "id": "any_valid_string_or_identifier",
  "dataBase64": "SGVsbG8gU2ltcGxlIFN0b3JhZ2UgV29ybGQh",
  "backend": "local"    // "db" | "s3" | "ftp"
}
```
GET /v1/blobs/:id
Get blob by id


# Testing

Run test
```bash
npm run test
```

Run integration tests:
```bash
npm run test:int
```

Run integration tests (database only):
```bash
npm run test:int:db
```
