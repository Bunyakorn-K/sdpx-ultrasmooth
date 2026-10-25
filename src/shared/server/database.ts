import { AppError } from "@/shared/domain/app-error";
import postgres from "postgres";

export type DatabaseValue = string | number | boolean | null;
export type DatabaseRow = Record<string, unknown>;
export type DatabaseQuery = (
  strings: TemplateStringsArray,
  ...values: DatabaseValue[]
) => Promise<DatabaseRow[]>;

let localConnection: ReturnType<typeof postgres> | undefined;

/** Standard PostgreSQL client for Supabase and local/CI environments */
export function database(): DatabaseQuery {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString)
    throw new AppError("ยังไม่ได้เชื่อมต่อฐานข้อมูล กรุณาตั้งค่า DATABASE_URL", 503);
  if (
    process.env.DATABASE_DRIVER &&
    process.env.DATABASE_DRIVER !== "postgres" &&
    process.env.DATABASE_DRIVER !== "supabase"
  )
    throw new AppError("DATABASE_DRIVER ต้องเป็น postgres หรือ supabase", 503);

  localConnection ??= postgres(connectionString, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    types: {
      jsonb: {
        to: 3802,
        from: [3802],
        serialize: (value: unknown) =>
          typeof value === "string" ? value : JSON.stringify(value),
        parse: JSON.parse,
      },
    },
  });

  const connection = localConnection;
  return (strings, ...values) => {
    const statement = strings.reduce(
      (query, part, index) => query + (index ? `$${index}` : "") + part,
      "",
    );
    return connection.unsafe(statement, values);
  };
}
