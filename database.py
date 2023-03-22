import sqlite3  # https://www.runoob.com/sqlite/sqlite-tutorial.html

# Database Setup


def dict_factory(cursor, row):
    d = {}
    for idx, col in enumerate(cursor.description):
        d[col[0]] = row[idx]
    return d


def init_db():
    conn = sqlite3.connect('./database.db', check_same_thread=False)
    conn.row_factory = dict_factory  # Return result as dict
    return conn


def close_db(conn):
    conn.commit()
    conn.close()


def execute(sql, paras=None):
    conn = init_db()
    cursor = conn.cursor()
    if paras is None:
        cursor.execute(sql)
    else:
        cursor.execute(sql, paras)
    close_db(conn)


def fetch_result(sql):
    conn = init_db()
    cursor = conn.cursor()
    cursor.execute(sql)
    values = cursor.fetchall()
    close_db(conn)
    return values


# Query
def query_all(table):
    sql = f'SELECT * FROM {table}'
    return fetch_result(sql)


def query_by_key(table: str,  key: str, value):
    sql = f'SELECT * FROM {table} WHERE {key}="{value}"'
    return fetch_result(sql)

# Update


def update_by_id(table: str, row: dict, columns: list):
    sql = f'UPDATE {table} SET '
    paras = []
    for column in columns:
        sql = sql + column + '=?, '
        paras.append(row[column])
    sql = sql[:-2] + ' WHERE id=?'
    paras.append(row['id'])
    execute(sql, paras)

# Delete


def delete_by_key(table: str,  key: str, value):
    sql = f'DELETE FROM {table} WHERE {key}=?'
    print(sql)
    execute(sql, value)

# Insert


def insert_row(table: str, row: dict, columns: list):
    sql_props = ''
    paras = []
    for column in columns:
        sql_props = sql_props + column + ', '
        paras.append(row[column])
    sql = f'INSERT INTO {table} ({sql_props[:-2]}) VALUES ({(len(columns)*"?,")[:-1]})'
    execute(sql, paras)


def get_last_insert_id(table: str):
    sql = f'select seq from sqlite_sequence where name="{table}"'
    results = fetch_result(sql)
    return results[0]['seq']
