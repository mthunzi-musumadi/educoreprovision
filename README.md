# educore-provision
ICT Purchase Scheme Simplification and Digitalisation

## Local development

The backend stores application state in PostgreSQL. Create a local `.env` file
from `.env.example` and set the PostgreSQL connection values. The configured
database must already exist and be reachable at the selected host and port.
On startup, the backend creates the `educore_app_state` table and seeds it with
the demo data only when that table is empty.

Install dependencies with `npm install`, then run `npm run dev`. The server
fails to start if it cannot connect to PostgreSQL.
