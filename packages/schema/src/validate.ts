import _Ajv from "ajv/dist/2020.js";
import _addFormats from "ajv-formats";
import type { Catalogue, MachineDefinition, Provenance } from "./types.js";
import machineSchema from "./schemas/machine-definition.schema.json" with { type: "json" };
import catalogueSchema from "./schemas/catalogue.schema.json" with { type: "json" };
import provenanceSchema from "./schemas/provenance.schema.json" with { type: "json" };

const Ajv = _Ajv as unknown as typeof import("ajv/dist/2020.js").default;
const addFormats = _addFormats as unknown as typeof import("ajv-formats").default;

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

const validateDefinitionFn = ajv.compile(machineSchema);
const validateCatalogueFn = ajv.compile(catalogueSchema);
const validateProvenanceFn = ajv.compile(provenanceSchema);

function assertValid(ok: boolean, validate: { errors?: unknown }): void {
  if (!ok) {
    throw new Error(
      `schema validation failed: ${JSON.stringify(validate.errors, null, 2)}`,
    );
  }
}

export function validateMachineDefinition(
  value: unknown,
): asserts value is MachineDefinition {
  assertValid(validateDefinitionFn(value), validateDefinitionFn);
}

export function validateCatalogue(value: unknown): asserts value is Catalogue {
  assertValid(validateCatalogueFn(value), validateCatalogueFn);
}

export function validateProvenance(value: unknown): asserts value is Provenance {
  assertValid(validateProvenanceFn(value), validateProvenanceFn);
}
