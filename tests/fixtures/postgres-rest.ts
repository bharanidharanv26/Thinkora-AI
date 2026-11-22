import type { PGlite } from "@electric-sql/pglite";

// A small PostgREST transport for integration tests. The real Supabase client
// builds the requests; PostgreSQL executes the application's constraints and SQL.
export function postgresRest(db: PGlite): typeof fetch {
  let queue = Promise.resolve();
  const identifier = (name: string) => {
    if (!/^[a-z_]+$/.test(name)) throw new Error(`Unsupported SQL identifier: ${name}`);
    return `"${name}"`;
  };
  return (input, init) => {
    const request = new Request(input, init);
    const result = queue.then(async () => {
      const url = new URL(request.url);
      const table = identifier(url.pathname.split("/").at(-1)!);
      const params: unknown[] = [];
      const bind = (value: unknown) => { params.push(value); return `$${params.length}`; };
      const body = request.method === "POST" || request.method === "PATCH" ? await request.json() as Record<string, unknown> : {};
      const columns = Object.keys(body);
      let sql: string;
      if (request.method === "POST") {
        sql = `insert into ${table} (${columns.map(identifier).join(",")}) values (${columns.map(key => bind(body[key])).join(",")})`;
        if (url.searchParams.has("on_conflict")) sql += ` on conflict (${identifier(url.searchParams.get("on_conflict")!)}) do update set ${columns.map(key => `${identifier(key)}=excluded.${identifier(key)}`).join(",")}`;
      } else if (request.method === "PATCH") {
        sql = `update ${table} set ${columns.map(key => `${identifier(key)}=${bind(body[key])}`).join(",")}`;
      } else if (request.method === "DELETE") {
        sql = `delete from ${table}`;
      } else {
        const select = url.searchParams.get("select") || "*";
        sql = `select ${select === "*" ? "*" : select.split(",").map(identifier).join(",")} from ${table}`;
      }
      const filters: string[] = [];
      for (const [key, value] of url.searchParams) {
        if (["select", "order", "limit", "on_conflict"].includes(key)) continue;
        const column = identifier(key);
        if (value.startsWith("eq.")) filters.push(`${column}=${bind(value.slice(3))}`);
        else if (value === "is.null") filters.push(`${column} is null`);
        else if (value.startsWith("gt.")) filters.push(`${column}>${bind(value.slice(3))}`);
        else if (value.startsWith("in.(")) filters.push(`${column} in (${value.slice(4, -1).split(",").map(bind).join(",")})`);
        else throw new Error(`Unsupported test filter: ${value}`);
      }
      if (filters.length) sql += ` where ${filters.join(" and ")}`;
      if (request.method === "GET") {
        const order = url.searchParams.get("order");
        if (order) { const [column, direction] = order.split("."); sql += ` order by ${identifier(column)} ${direction === "desc" ? "desc" : "asc"}`; }
        if (url.searchParams.has("limit")) sql += ` limit ${bind(Number(url.searchParams.get("limit")))}`;
      } else sql += " returning *";

      await db.exec("savepoint rest_request");
      try {
        const { rows } = await db.query(sql, params);
        await db.exec("release savepoint rest_request");
        if (request.headers.get("accept")?.includes("vnd.pgrst.object")) {
          if (rows.length !== 1) return Response.json({ code: "PGRST116", message: "Expected one row", details: `The result contains ${rows.length} rows` }, { status: 406 });
          return Response.json(rows[0]);
        }
        return Response.json(rows);
      } catch (error) {
        await db.exec("rollback to savepoint rest_request; release savepoint rest_request");
        const failure = error as { code: string; message: string };
        return Response.json({ code: failure.code, message: failure.message }, { status: failure.code === "23505" ? 409 : 400 });
      }
    });
    queue = result.then(() => undefined, () => undefined);
    return result;
  };
}
