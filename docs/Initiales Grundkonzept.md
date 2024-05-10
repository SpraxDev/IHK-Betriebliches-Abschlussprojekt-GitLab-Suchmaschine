|                                    |                                     |
|------------------------------------|-------------------------------------|
| Sprachen                           | TypeScript, (Pg)SQL, CSS, HTML      |
| Backend                            | Node.js v20 (LTS)                   |
| Framework                          | NestJS maybe? (relativ opinionated) |
| Nötige externe Dienste             | PostgreSQL v15, GitLab API          |
| Voraussichtlich nötige Executables | `git`                               |

Schon mehrfach bestand Unklarheit, wie eine bestimmte Komponente genutzt wird oder ob überhaupt.
Eine Code-Suche, die vllt. sogar Syntax/Code-Aware ist, wäre hier sicherlich extrem hilfreich beim Einschätzen,
ob und wie andere Projekte etwas nutzen und ob es z. B. der Breaking Change wert ist.

> Zeitschätzung in PT sind grob und (vermutlich) ohne automatisierte Tests

## Offene Fragen
* Such-Syntax parser: How?
    * Eine (E)DNF Parser-/Compiler-Lib wie `nodebnf`, `ebnf-parser`, `Jiso`?
    * Oder doch lieber selber schreiben?
* Datenbank-Struktur für alles: How?
    * Code/Syntax-Aware indexing/querying: How?
* Deployment sieht vermutlich wie aus? Docker-Container?
    * Wird GitLab einen WebHook zu uns schicken können?

## Komponenten
* Indexer ***[~5 PT für Datei/Code Indexierung]***
    * Soll "smart" erkennen können welche Projekte ein Update brauchen
        * WebHook?
        * Kann die GitLab API aushelfen?
        * Egal ob Webhook oder nicht, alle Repos werden regelmäßig auf Änderungen geprüft
    * Muss alles irgendwie strukturiert bekommen
* Suchmaschine ***[~7 PT]***
    * Umfangreiche Syntax für gezielte Queries (siehe unten)
        * Vergleichbar zur neuen GitHub-Suche wäre mega
    * Code/Syntax-Aware (PHP, YAML, JS, TS, JSON, ...)
* UI ***[~2 PT ohne Syntaxhervorhebung und Vorschlägen]***
    * [Bootstrap](https://getbootstrap.com/), wenn ich das UI baue
    * (Code-)Suchergebnisse vllt. mit [Monaco Editor](https://microsoft.github.io/monaco-editor/) darstellen?
    * Infos / Statistiken zu Repos/Projekten (+ Globale Stats?)
        * Im Index sind schon sehr viele Infos enthalten, die sich mit paar extra SQL-Queries abfragen lassen
            * Anzahl/Aufstellung Commits, Dateien, Dateigröße, Dateitypen, ...
    * Wenn ich die Such-Query Tippe hätte ich gerne Live-Feedback wie sie quasi geparsed wird (Farben?) oder Vorschläge bei bestimmten Qualifiers
* Zugriffskontrolle (siehe unten) ***[~2–4 PT]***

### Indexer
Folgendes wird indexiert (Immer Metadata + Content):
* Dateien / Code
* Issues
* Merge Requests
* Commits
* Registry
* Repositories

Natürlich muss der Indexer auch bemerken, wenn Repos, Commits, etc. gelöscht wurden.

Vermutlich indexieren wir immer nur den Standard-Branch eines Repos für die Datei/Code suche – Commit-Suche/Index kann aber
weiterhin Suchtreffer aus anderen Branches anzeigen (+ alte Changes die nicht mehr im Standard-Branch existieren)

### Suchmaschine
Beispiel Use-Cases die möglich sein sollten:
* `language:php RandomClassName`
* `language:php RandomClassName::methodName`
* `language:php RandomClassName#methodName`
* `project.deprecated_class.service_id`
* `Electronic Minds org:some-namespace`

#### Syntax-Ideen

##### Exakte Wortübereinstimmung
Mittels Anführungszeichen `"foo bar"` oder wenn es Anführungszeichen im Suchbegriff gibt, dann mit `\` escapen `"foo \"bar\""`

##### boolean operations
`AND`, `OR`, `NOT` und Klammern `(` `)` sind möglich

##### Qualifiers
* `org:some-namespace` or `user:some-namespace` (`user` ist ein *alias*, desseiden GitLab API unterscheidet zwischen Org. und User)
* `repo:some-namespace/project` (volle identifier)
* `language:php` or `language:"php"`
* `path:unit_tests`
* `path:src/*.js`
* `path:/(^|\/)README\.md$/`
* `content:"Hello world"` (Durchsucht nur Dateiinhalt und nicht auf Pfad/Dateinamen)


### Zugriffskontrolle
Man müsste die Frage klären was für Repos alles indexiert werden und
wer alles Zugriff auf die Suchfunktion hat.

* Gibt es einen OAuth 2.0 login, um Gruppenzugehörigkeit/Read-Rechte eines Nutzers abzufragen?
* Sind Repos, die Developer sehen kann auch ohne Login sichtbar?
* Werden private Repos auch indexiert? Nur bestimmte Orgs/User?
    * Kann ein eingeloggter User sagen, dass er sie indexiert haben will?


## Weitere Ideen/Ausbaustufen
### Browser Addon (Suchmaschine)
Man soll die Suche im Browser als Suchmaschine hinzufügen können.
Ob es hierfür ein Addon benötigt, müsste man im Detail untersuchen. (https://developer.mozilla.org/en-US/docs/Web/OpenSearch#autodiscovery_of_search_plugins)
* Direktverweise sollen ohne Suchergebnis-Seite umleiten (z.B. `some-namespace/project`)

Optimalfall: Ich möchte `som` tippen und `some-namespace/` vorgeschlagen bekommen, auswählen und `pr` tippen und `some-namespace/project` vorgeschlagen bekommen. Eine Suche danach sollte dann direkt auf die GitLab-Repo-Seite führen.


<!--
Bing Chat hat folgende Definition generiert (BNF/EBNF), welche ein guter Startpunkt sein könnte:
<search> ::= <term> | <term> <boolean-op> <search>
<term> ::= <word> | <phrase> | <qualifier>
<word> ::= <letter>+
<phrase> ::= '"' <letter>* '"'
<qualifier> ::= <qualifier-name> ':' <qualifier-value>
<qualifier-name> ::= 'org' | 'user' | 'repo' | 'language' | 'path' | 'content'
<qualifier-value> ::= <word> | <phrase> | <pattern>
<pattern> ::= '*' | '/' | '(' | ')' | '.' | '^' | '$' | '\' | '[' | ']' | '{' | '}' | '+' | '?' | '|' | '-'
<boolean-op> ::= 'AND' | 'OR' | 'NOT'
<letter> ::= any character except '"' or ':' or '\'


Pattern ist weird, Escaping von " hat er nicht gemacht aber grundsätzlich ist das überraschend brauchbar
-->
