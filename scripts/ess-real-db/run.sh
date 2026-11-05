#!/usr/bin/env bash
# Start real database servers in Docker and run the outside-SQL client cases against them.
#   scripts/ess-real-db/run.sh [up|test|stop|all] [postgresql mysql mariadb sqlserver oracle ...]
# `all` (the default) starts the named databases (default: all five), runs the cases and leaves the containers
# running; `stop` stops and removes only the containers this script made (names start with tabularius-ess-).
# Needs Docker and Node 22.20 or newer. The passwords are throwaway values for these local containers.
set -euo pipefail
cd "$(dirname "$0")/../.."
action="${1:-all}"; shift || true
dbs=("$@"); [ ${#dbs[@]} -eq 0 ] && dbs=(postgresql mysql mariadb sqlserver oracle)
PW='Ess-Test-1-aA'
CERTS="$(pwd)/.ess-real-db"   # server certificates for the TLS cases; ignored by git
mkdir -p "$CERTS"

name() { echo "tabularius-ess-$1"; }
running() { docker ps --format '{{.Names}}' | grep -qx "$(name "$1")"; }

wait_healthy() {
  local n; n="$(name "$1")"
  for _ in $(seq 1 120); do
    [ "$(docker inspect -f '{{.State.Health.Status}}' "$n" 2>/dev/null)" = healthy ] && return 0
    sleep 3
  done
  echo "$1 did not become healthy" >&2; docker logs --tail 30 "$n" >&2; return 1
}

up() {
  case "$1" in
    postgresql)
      running postgresql || docker run -d --name "$(name postgresql)" -p 127.0.0.1:55432:5432 \
        -e POSTGRES_USER=ess -e POSTGRES_PASSWORD="$PW" -e POSTGRES_DB=ess \
        --health-cmd 'pg_isready -U ess -d ess -h 127.0.0.1' --health-interval 3s --health-retries 40 \
        --entrypoint sh postgres:17 -c '
          openssl req -x509 -newkey rsa:2048 -nodes -days 2 -subj /CN=localhost \
            -addext "subjectAltName=DNS:localhost,IP:127.0.0.1" -keyout /var/lib/postgresql/server.key -out /var/lib/postgresql/server.crt 2>/dev/null
          chown postgres:postgres /var/lib/postgresql/server.* && chmod 600 /var/lib/postgresql/server.key
          exec docker-entrypoint.sh postgres -c ssl=on -c ssl_cert_file=/var/lib/postgresql/server.crt -c ssl_key_file=/var/lib/postgresql/server.key' >/dev/null
      wait_healthy postgresql
      docker exec "$(name postgresql)" cat /var/lib/postgresql/server.crt > "$CERTS/postgresql.pem" ;;
    mysql)
      running mysql || docker run -d --name "$(name mysql)" -p 127.0.0.1:53306:3306 \
        -e MYSQL_ROOT_PASSWORD="$PW" -e MYSQL_DATABASE=ess -e MYSQL_USER=ess -e MYSQL_PASSWORD="$PW" \
        --health-cmd "mysqladmin ping -h 127.0.0.1 -uroot -p$PW" --health-interval 3s --health-retries 60 \
        mysql:8.4 --mysql-native-password=ON >/dev/null
      wait_healthy mysql
      docker exec "$(name mysql)" cat /var/lib/mysql/ca.pem > "$CERTS/mysql.pem" ;;
    mariadb)
      running mariadb || docker run -d --name "$(name mariadb)" -p 127.0.0.1:53307:3306 \
        -e MARIADB_ROOT_PASSWORD="$PW" -e MARIADB_DATABASE=ess -e MARIADB_USER=ess -e MARIADB_PASSWORD="$PW" \
        --health-cmd 'healthcheck.sh --connect --innodb_initialized' --health-interval 3s --health-retries 60 \
        mariadb:11 >/dev/null
      wait_healthy mariadb ;;
    sqlserver)
      if ! running sqlserver; then
        # A certificate for localhost so the verified TLS path can be tested; SQL Server's own one is self-signed with another name.
        mkdir -p "$CERTS/sqlserver"
        openssl req -x509 -newkey rsa:2048 -nodes -days 2 -subj /CN=localhost -addext "subjectAltName=DNS:localhost,IP:127.0.0.1" \
          -keyout "$CERTS/sqlserver/server.key" -out "$CERTS/sqlserver/server.crt" 2>/dev/null
        chmod 644 "$CERTS/sqlserver/server.key"   # throwaway key for a local test container; the server runs as another user
        printf '[network]\ntlscert = /etc/ssl/ess/server.crt\ntlskey = /etc/ssl/ess/server.key\ntlsprotocols = 1.2\nforceencryption = 1\n' > "$CERTS/sqlserver/mssql.conf"
        docker run -d --name "$(name sqlserver)" -p 127.0.0.1:51433:1433 \
          -v "$CERTS/sqlserver:/etc/ssl/ess:ro" -v "$CERTS/sqlserver/mssql.conf:/var/opt/mssql/mssql.conf:ro" \
          -e ACCEPT_EULA=Y -e MSSQL_SA_PASSWORD="$PW" \
          --health-cmd "/opt/mssql-tools18/bin/sqlcmd -C -S localhost -U sa -P $PW -Q 'SELECT 1'" --health-interval 5s --health-retries 60 \
          mcr.microsoft.com/mssql/server:2022-latest >/dev/null
      fi
      wait_healthy sqlserver
      cp "$CERTS/sqlserver/server.crt" "$CERTS/sqlserver.pem"
      docker exec "$(name sqlserver)" /opt/mssql-tools18/bin/sqlcmd -C -S localhost -U sa -P "$PW" -Q 'IF DB_ID(N'"'"'ess'"'"') IS NULL CREATE DATABASE ess' >/dev/null ;;
    oracle)
      running oracle || docker run -d --name "$(name oracle)" -p 127.0.0.1:51521:1521 \
        -e ORACLE_PASSWORD="$PW" -e APP_USER=ess -e APP_USER_PASSWORD="$PW" \
        --health-cmd healthcheck.sh --health-interval 5s --health-retries 80 \
        gvenzl/oracle-free:23-slim-faststart >/dev/null
      wait_healthy oracle ;;
    *) echo "unknown database $1" >&2; exit 2 ;;
  esac
  echo "$1 is up"
}

run_tests() {
  local list; list="$(IFS=,; echo "${dbs[*]}")"
  # TLS: the servers' own certificates are the trust anchors for the verify-full cases.
  [ -f "$CERTS/postgresql.pem" ] && export TABULARIUS_ESS_REAL_POSTGRESQL_CA="$(cat "$CERTS/postgresql.pem")"
  [ -f "$CERTS/mysql.pem" ] && export TABULARIUS_ESS_REAL_MYSQL_CA="$(cat "$CERTS/mysql.pem")"
  [ -f "$CERTS/sqlserver.pem" ] && export TABULARIUS_ESS_REAL_SQLSERVER_CA="$(cat "$CERTS/sqlserver.pem")"
  TABULARIUS_ESS_REAL="$list" node --no-warnings --test --test-concurrency=1 --test-reporter="${TABULARIUS_ESS_REAL_REPORTER:-spec}" packages/store/test/ess-real-databases.test.ts
}

stop() { for d in postgresql mysql mariadb sqlserver oracle; do docker rm -f "$(name "$d")" >/dev/null 2>&1 && echo "removed $(name "$d")" || true; done; }

case "$action" in
  up) for d in "${dbs[@]}"; do up "$d"; done ;;
  test) run_tests ;;
  stop) stop ;;
  all) for d in "${dbs[@]}"; do up "$d"; done; run_tests ;;
  *) echo "usage: $0 [up|test|stop|all] [databases...]" >&2; exit 2 ;;
esac
