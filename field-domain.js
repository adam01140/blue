/**
 * Infer which part of a form a field belongs to — from PDF field id and semantic name only.
 * Do NOT use PDF section hints or vision output.
 */

const { isOperatorField } = require('./field-name-canonicalizer');

const DOMAIN_ORDER = ['Agency', 'Applicant', 'Employer', 'Service', 'Operator', 'Legal'];

function inferFieldDomain(field) {
  const id = String(field?.id || '').toLowerCase();
  const name = String(field?.newName || '').toLowerCase();
  const label = String(field?.label || '').toLowerCase();

  if (isOperatorField(field)) return 'Operator';
  if (/operator|transmitting|lsid|amount.?collected|amount.?billed/.test(id) && !/applicant|employer|firstname|lastname/.test(id)) {
    return 'Operator';
  }

  if (/\.ori\[0\]|authorizedapptype|typeof\[0\]|agencyauthorized|mailcode\[0\]|streetaddress|contactname|city\[0\]|zip\[0\]|phonenum\[0\]|billingnumber/.test(id)) {
    return 'Agency';
  }
  if (/emplname|\.address\[0\]|phonenum\[1\]|city\[2\]|zip\[2\]|mailcode\[1\]/.test(id)) {
    return 'Employer';
  }
  if (/\.doj\[0\]|\.fbi\[0\]/.test(id)) {
    return 'Service';
  }
  if (/\.dob\[0\]|dlnumber|height|weight|\.eye\[0\]|hair|\.pob\[0\]|\.ssn\[0\]|miscnumber|streetorpo|city\[1\]|zip\[1\]|datetimefield1|origati|morf/.test(id)) {
    return 'Applicant';
  }
  if (/yournumber|billingnumber/.test(id)) {
    return 'Agency';
  }

  if (/^employer_/.test(name) || /^employer\b/.test(label)) return 'Employer';
  if (/level_of_service|_doj$|_fbi$/.test(name)) return 'Service';
  if (/^applicant_|^other_name|home_|date_of_birth|drivers_license|social_security|place_of_birth|miscellaneous|original_ati|applicant_sex|first_name|last_name|middle_initial|suffix|height|weight|hair_color|eye_color/.test(name)) {
    return 'Applicant';
  }
  if (/your_number|oca_number|billing_number/.test(name)) {
    return 'Agency';
  }
  if (/^agency_|^ori_code$|^mail_code$|^contact_|authorized_applicant|agency_authorized|type_of_license|billing_number/.test(name)) {
    return 'Agency';
  }
  if (/signature|privacy/.test(name + label)) return 'Legal';

  if (/street|address|city|zip|phone|telephone|mail/.test(name + label)) {
    if (/employer/.test(name + label)) return 'Employer';
    if (/agency|contact|ori|mail_code|contributing/.test(name + label)) return 'Agency';
    if (/home|applicant/.test(name + label)) return 'Applicant';
  }

  return 'Applicant';
}

function getDomainWording(domain) {
  switch (domain) {
    case 'Agency':
      return {
        possessive: "the contributing agency's",
        subject: 'the contributing agency',
        who: 'the agency',
        pdfSection: 'Contributing Agency Information',
        notWho: 'your personal',
      };
    case 'Employer':
      return {
        possessive: "your employer's",
        subject: 'your employer',
        who: 'your employer',
        pdfSection: 'Employer Information',
        notWho: 'your personal',
      };
    case 'Service':
      return {
        possessive: 'your',
        subject: 'you (the applicant)',
        who: 'you',
        pdfSection: 'Level of Service',
        notWho: 'the agency',
      };
    case 'Operator':
      return {
        possessive: "the operator's",
        subject: 'the live scan operator',
        who: 'the operator',
        pdfSection: 'Live Scan Completion',
        notWho: 'the applicant',
      };
    case 'Legal':
      return {
        possessive: 'your',
        subject: 'you (the applicant)',
        who: 'you',
        pdfSection: 'Signature and Privacy',
        notWho: 'the agency',
      };
    default:
      return {
        possessive: 'your',
        subject: 'you (the applicant)',
        who: 'you',
        pdfSection: 'Applicant Information',
        notWho: 'the agency',
      };
  }
}

function groupFieldsByDomain(orderedFields) {
  const buckets = new Map();
  for (const entry of orderedFields) {
    const domain = inferFieldDomain(entry.field);
    if (!buckets.has(domain)) buckets.set(domain, []);
    buckets.get(domain).push(entry);
  }
  return buckets;
}

function mergeDomainBuckets(buckets) {
  const sections = new Map();

  const addTo = (name, items) => {
    if (!items?.length) return;
    if (!sections.has(name)) sections.set(name, []);
    sections.get(name).push(...items);
  };

  addTo('Agency', buckets.get('Agency'));
  addTo('Applicant', buckets.get('Applicant'));
  addTo('Applicant', buckets.get('Service'));
  addTo('Applicant', buckets.get('Legal'));
  addTo('Employer', buckets.get('Employer'));
  addTo('Agency', buckets.get('Operator'));

  return sections;
}

function splitItemsIntoSections(items, names) {
  const chunks = [];
  const count = Math.min(Math.max(names.length, 2), 3);
  const size = Math.ceil(items.length / count);
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  while (chunks.length < 2 && items.length >= 2) {
    const last = chunks.pop();
    const mid = Math.ceil(last.length / 2);
    chunks.push(last.slice(0, mid), last.slice(mid));
  }
  const result = new Map();
  chunks.forEach((chunk, idx) => {
    result.set(names[idx] || `Section ${idx + 1}`, chunk);
  });
  return result;
}

function planFormSections(orderedFields) {
  const buckets = groupFieldsByDomain(orderedFields);
  let sections = mergeDomainBuckets(buckets);

  const nonEmpty = [...sections.entries()].filter(([, items]) => items.length > 0);

  if (nonEmpty.length === 0) {
    return new Map([['General', orderedFields]]);
  }

  if (nonEmpty.length === 1) {
    const [name, items] = nonEmpty[0];
    const domains = [...new Set(items.map((e) => inferFieldDomain(e.field)))];
    if (domains.length >= 2) {
      const rebuilt = new Map();
      for (const domain of DOMAIN_ORDER) {
        const slice = items.filter((e) => inferFieldDomain(e.field) === domain);
        if (!slice.length) continue;
        const sectionName = domain === 'Service' || domain === 'Legal' ? 'Applicant' : domain;
        if (!rebuilt.has(sectionName)) rebuilt.set(sectionName, []);
        rebuilt.get(sectionName).push(...slice);
      }
      sections = rebuilt;
    } else {
      const defaultNames = name === 'Agency'
        ? ['Agency', 'Applicant', 'Employer']
        : ['Applicant', 'Employer', 'Other'];
      return splitItemsIntoSections(items, defaultNames);
    }
  }

  if (sections.size > 4) {
    const operator = sections.get('Agency')?.filter((e) => inferFieldDomain(e.field) === 'Operator') || [];
    const agency = sections.get('Agency')?.filter((e) => inferFieldDomain(e.field) !== 'Operator') || [];
    sections.set('Agency', agency);
    if (operator.length) sections.set('Agency', [...(sections.get('Agency') || []), ...operator]);
  }

  const ordered = new Map();
  for (const name of ['Agency', 'Applicant', 'Employer']) {
    if (sections.has(name) && sections.get(name).length) {
      ordered.set(name, sections.get(name));
    }
  }
  for (const [name, items] of sections.entries()) {
    if (!ordered.has(name) && items.length) ordered.set(name, items);
  }

  if (ordered.size < 2 && orderedFields.length >= 2) {
    const all = orderedFields;
    return splitItemsIntoSections(all, ['Agency', 'Applicant']);
  }

  return ordered;
}

module.exports = {
  DOMAIN_ORDER,
  inferFieldDomain,
  getDomainWording,
  groupFieldsByDomain,
  planFormSections,
};
