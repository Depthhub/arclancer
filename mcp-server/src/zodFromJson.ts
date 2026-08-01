import { z } from "zod";

type JsonSchema = {
  type?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  enum?: string[];
  items?: JsonSchema;
};

function propToZod(prop: JsonSchema, required: boolean): z.ZodTypeAny {
  let schema: z.ZodTypeAny;
  if (prop.enum?.length) {
    schema = z.enum(prop.enum as [string, ...string[]]);
  } else if (prop.type === "number" || prop.type === "integer") {
    schema = z.number();
  } else if (prop.type === "boolean") {
    schema = z.boolean();
  } else if (prop.type === "array") {
    schema = z.array(z.any());
  } else if (prop.type === "object") {
    schema = z.record(z.any());
  } else {
    schema = z.string();
  }
  return required ? schema : schema.optional();
}

export function jsonSchemaToZodShape(
  inputSchema: Record<string, unknown>
): Record<string, z.ZodTypeAny> {
  const schema = inputSchema as JsonSchema;
  const props = schema.properties ?? {};
  const required = new Set(schema.required ?? []);
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const [key, prop] of Object.entries(props)) {
    shape[key] = propToZod(prop, required.has(key));
  }
  return shape;
}
