# GitLab-Suchmaschine
## Project dependencies
* Node.js and npm (see [package.json](./package.json))
* A [PostgreSQL database](https://www.postgresql.org/) (developed with v16 but latest stable should be preferred)
* [`file` command](https://astron.com/pub/file/) (developed with v5.4.5) (optional but recommended)

## Development

### Setup
* Install project dependencies (`npm install`)
* Copy `.env.dev` to `.env`
* Use Docker Compose by running `dev/up.sh` to get PostgreSQL and GitLab instances up and running.
    * GitLab will be available at http://172.52.0.100
    * PostgreSQL will be available at `172.52.0.10:5432`
    * You can extract the initial admin password with `dev/extractGitLabLogin.sh`
* Run `prisma:migrate:dev` to apply the migrations to the database

### Running the application
* Make sure the dev containers are running (`dev/up.sh`)
* Run the application with `npm run dev`

### Changing the database schema
* Make changes to the schema in `prisma/schema.prisma`
* Run `prisma:migrate:dev` to apply the changes to the database
  * This will generate a new migration in `prisma/migrations/`

## Search Query Syntax
```bnf
nonWhitespaceChar ::= (any printable character except ' ')
escapedChar ::= '\' (any printable character)
char ::= nonWhitespaceChar | escapedChar

regex ::= '/' char+ '/'
qualifier ::= char+ ':' (char+ | '"' char+ '"' | regex)
word ::= char+ | '"' char+ '"' | qualifier | regex

tokenizer output:
word | '(' | ')' | '&&' | '||' | 'NOT'

term ::= NOT? (word | '(' andOperation ')')
orOperation ::= term ('||' term)*
andOperation ::= orOperation ('&&' orOperation)*

query ::= andOperation+
```
