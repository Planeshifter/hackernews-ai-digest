// Mirrors the analyst's output contract in prompt_analyst_meta.md. The existing
// guardrail, recurrence and anti-churn checks still decide whether to accept it.
const object = properties => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });
const string = { type: 'string' };
const integer = { type: 'integer' };
const boolean = { type: 'boolean' };
const array = items => ({ type: 'array', items });
const enumeration = values => ({ type: 'string', enum: values });
const proposal = object({
  changed: boolean,
  newPrompt: { type: ['string', 'null'] },
  rationale: string,
  evidencePrNumbers: array(integer),
});

module.exports = object({
  schemaVersion: { type: 'integer', enum: [1] },
  window: object({ since: string, until: string }),
  prCount: integer,
  editedPrCount: integer,
  confidence: enumeration(['low', 'medium', 'high']),
  changeSummary: string,
  reportMarkdown: string,
  editTaxonomy: array(object({
    category: enumeration('ABCDEFGHIJ'.split('')),
    section: enumeration(['SUBMISSION', 'DISCUSSION', 'STRUCTURAL', 'AMBIGUOUS']),
    remedyRoute: enumeration(['PROMPT_ADDRESSABLE', 'ALREADY_FORBIDDEN', 'NOT_PROMPT_ADDRESSABLE']),
    distinctDays: integer,
    distinctPrs: integer,
    evidencePrNumbers: array(integer),
    qualifiesForEdit: boolean,
    exampleDiff: string,
    proposedRemedy: string,
  })),
  pipelineRecommendations: array(string),
  proposals: object({ submission: proposal, discussion: proposal }),
});
