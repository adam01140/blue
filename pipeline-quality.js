/**
 * Single entry point for form_config quality refinement and validation.
 * Used by postProcess, repair scripts, and audits.
 */

const {
  repairQuestionTextQuality,
  consolidateAddressQuestions,
  applyDomainSectionTitles,
  validateQuestionTextQuality,
  trustedStructuredContext,
} = require('./form-config-quality');
const {
  wireCheckboxFollowUpLogic,
  normalizeVagueGateQuestions,
  removeUnnecessaryOptionalGates,
} = require('./form-conditional-logic');

function applyFullQualityPass(formConfig, fieldConfig, payload = {}) {
  let config = formConfig;
  config = consolidateAddressQuestions(config, fieldConfig, payload);
  config = wireCheckboxFollowUpLogic(config, fieldConfig);
  config = normalizeVagueGateQuestions(config, fieldConfig);
  config = removeUnnecessaryOptionalGates(config, fieldConfig);
  config = applyDomainSectionTitles(config, fieldConfig);
  config = repairQuestionTextQuality(config, fieldConfig, payload);
  return config;
}

function validateFullQuality(formConfig, fieldConfig, payload = {}) {
  return validateQuestionTextQuality(formConfig, fieldConfig, payload);
}

module.exports = {
  applyFullQualityPass,
  validateFullQuality,
  trustedStructuredContext,
};
