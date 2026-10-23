// Minimal JSON Schema validator for the subset used by schema/data.schema.json:
// $ref, type, required, properties, additionalProperties, items, enum, pattern,
// minItems, uniqueItems and minLength. No dependencies, no remote resolution.
//
// It exists so tests can hold data.json to the published schema without adding a
// package manager to a repository that otherwise runs on plain Node.

const typeOf = v => {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  if (Number.isInteger(v)) return 'integer';
  return typeof v;
};

const matchesType = (value, type) => {
  const actual = typeOf(value);
  if (type === 'number') return actual === 'number' || actual === 'integer';
  if (type === 'integer') return actual === 'integer';
  return actual === type;
};

export function validateSchema(value, schema, root = schema, path = '$') {
  const errors = [];
  if (!schema || typeof schema !== 'object') return errors;

  if (schema.$ref) {
    const target = schema.$ref
      .replace(/^#\//, '')
      .split('/')
      .reduce((node, key) => (node == null ? node : node[key]), root);
    if (!target) return [`${path}: unresolved $ref ${schema.$ref}`];
    return validateSchema(value, target, root, path);
  }

  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some(t => matchesType(value, t))) {
      errors.push(`${path}: expected ${types.join(' or ')}, got ${typeOf(value)}`);
      return errors;
    }
  }

  if (schema.enum && !schema.enum.some(x => JSON.stringify(x) === JSON.stringify(value))) {
    errors.push(`${path}: ${JSON.stringify(value)} is not one of ${schema.enum.join(', ')}`);
  }

  if (typeof value === 'string') {
    if (schema.minLength != null && value.length < schema.minLength) {
      errors.push(`${path}: shorter than ${schema.minLength}`);
    }
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
      errors.push(`${path}: does not match ${schema.pattern}`);
    }
  }

  if (Array.isArray(value)) {
    if (schema.minItems != null && value.length < schema.minItems) {
      errors.push(`${path}: needs at least ${schema.minItems} items`);
    }
    if (schema.uniqueItems) {
      const seen = new Set();
      for (const item of value) {
        const key = JSON.stringify(item);
        if (seen.has(key)) errors.push(`${path}: duplicate item ${key}`);
        seen.add(key);
      }
    }
    if (schema.items) {
      value.forEach((item, i) => errors.push(...validateSchema(item, schema.items, root, `${path}[${i}]`)));
    }
  }

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const key of schema.required || []) {
      if (!(key in value)) errors.push(`${path}: missing required property ${key}`);
    }
    const props = schema.properties || {};
    for (const [key, item] of Object.entries(value)) {
      if (props[key]) {
        errors.push(...validateSchema(item, props[key], root, `${path}.${key}`));
      } else if (schema.additionalProperties === false) {
        errors.push(`${path}: unexpected property ${key}`);
      }
    }
  }

  return errors;
}
