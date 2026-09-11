/**
 * Demo Form Hub admin: add / edit / delete hub entries.
 * New entries are stored in Firebase (Firestore + Storage) and mirrored locally
 * so the hub preview can load files without CORS issues.
 */
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const HUB_DIR = path.join(__dirname, 'public', 'Auto-Form-Creator', 'Demo_form_hub');
const FORMS_DIR = path.join(HUB_DIR, 'forms');
const MANIFEST_PATH = path.join(HUB_DIR, 'manifest.json');
const FIRESTORE_COLLECTION = 'demoHubEntries';
const STORAGE_PREFIX = 'demo-hub';

function readManifest() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    return {
      title: 'Demo Form Hub',
      subtitle: 'Stamp-approved AI pipeline outputs — frozen review copies',
      updatedAt: new Date().toISOString(),
      forms: [],
    };
  }
  return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
}

function writeManifest(manifest) {
  manifest.updatedAt = new Date().toISOString();
  if (!Array.isArray(manifest.forms)) manifest.forms = [];
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf8');
}

function slugify(input) {
  const base = String(input || '')
    .trim()
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  return base || `form-${Date.now()}`;
}

function uniqueSlug(desired, existingIds) {
  let slug = slugify(desired);
  if (!existingIds.has(slug)) return slug;
  let n = 2;
  while (existingIds.has(`${slug}-${n}`)) n += 1;
  return `${slug}-${n}`;
}

function getUploadedFile(files, key) {
  if (!files || !files[key]) return null;
  const file = Array.isArray(files[key]) ? files[key][0] : files[key];
  return file && file.data && file.data.length ? file : null;
}

function getUploadedFiles(files, key) {
  if (!files || !files[key]) return [];
  const raw = files[key];
  const list = Array.isArray(raw) ? raw : [raw];
  return list.filter((file) => file && file.data && file.data.length);
}

function assertExtension(file, allowed, label) {
  const name = String(file.name || '').toLowerCase();
  const ok = allowed.some((ext) => name.endsWith(ext));
  if (!ok) {
    throw new Error(`${label} must be one of: ${allowed.join(', ')}`);
  }
}

function safeFileName(name, fallback) {
  const cleaned = String(name || fallback || 'file')
    .replace(/[/\\?%*:|"<>]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
  return cleaned || fallback || 'file';
}

async function saveUpload(file, destPath) {
  await file.mv(destPath);
}

function formDir(slug) {
  return path.join(FORMS_DIR, slug);
}

function titleFromHtml(html) {
  const match = String(html || '').match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? match[1].replace(/\s+/g, ' ').trim() : '';
}

function countFormStats(html) {
  const text = String(html || '');
  const questions = (text.match(/<(input|textarea|select)\b/gi) || []).length;
  const sections = (text.match(/<section\b|class="[^"]*section[^"]*"/gi) || []).length;
  return { questions, sections };
}

function buildEntry(slug, {
  title,
  description = '',
  hasPdf,
  hasHtmlAll,
  hasHtmlOne,
  sections = 0,
  questions = 0,
  approvedAt,
  hasFieldMap,
  hasFormConfig,
  sourcePdfs = null,
  storedInFirebase = false,
}) {
  const pdfs = Array.isArray(sourcePdfs) && sourcePdfs.length
    ? sourcePdfs
    : (hasPdf ? [`forms/${slug}/source.pdf`] : []);
  return {
    id: slug,
    title: title || slug,
    description: description || '',
    sections: Number(sections) || 0,
    questions: Number(questions) || 0,
    approvedAt: approvedAt || new Date().toISOString().slice(0, 10),
    sourcePdf: pdfs[0] || null,
    sourcePdfs: pdfs,
    formHtml: hasHtmlAll ? `forms/${slug}/form-all-at-once.html` : null,
    formHtmlOneAtATime: hasHtmlOne ? `forms/${slug}/form-one-at-a-time.html` : null,
    formConfig: hasFormConfig ? `forms/${slug}/form_config.json` : null,
    fieldMap: hasFieldMap ? `forms/${slug}/field_map.json` : null,
    storedInFirebase: Boolean(storedInFirebase),
  };
}

function listLocalPdfs(slug) {
  const dir = formDir(slug);
  const extraDir = path.join(dir, 'pdfs');
  if (fs.existsSync(extraDir)) {
    const extras = fs.readdirSync(extraDir)
      .filter((name) => name.toLowerCase().endsWith('.pdf'))
      .sort()
      .map((name) => `forms/${slug}/pdfs/${name}`);
    if (extras.length) return extras;
  }
  const source = path.join(dir, 'source.pdf');
  return fs.existsSync(source) ? [`forms/${slug}/source.pdf`] : [];
}

function entryFromDisk(slug, title, description, prev = {}) {
  const dir = formDir(slug);
  const hasPdf = fs.existsSync(path.join(dir, 'source.pdf'));
  const hasHtmlAll = fs.existsSync(path.join(dir, 'form-all-at-once.html'));
  const hasHtmlOne = fs.existsSync(path.join(dir, 'form-one-at-a-time.html'));
  const hasFieldMap = fs.existsSync(path.join(dir, 'field_map.json'));
  const hasFormConfig = fs.existsSync(path.join(dir, 'form_config.json'));
  const sourcePdfs = listLocalPdfs(slug);
  return buildEntry(slug, {
    title: title || prev.title || slug,
    description: description != null ? description : (prev.description || ''),
    hasPdf,
    hasHtmlAll,
    hasHtmlOne,
    sections: prev.sections || 0,
    questions: prev.questions || 0,
    approvedAt: prev.approvedAt,
    hasFieldMap,
    hasFormConfig,
    sourcePdfs: sourcePdfs.length ? sourcePdfs : null,
    storedInFirebase: Boolean(prev.storedInFirebase),
  });
}

function rmDirRecursive(dir) {
  if (!fs.existsSync(dir)) return;
  fs.rmSync(dir, { recursive: true, force: true });
}

function firestoreDb() {
  return admin.firestore();
}

function storageBucket() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  return admin.storage().bucket(`${projectId}.firebasestorage.app`);
}

function publicFileUrl(slug, kind, index) {
  if (kind === 'html') return `/api/demo-hub/files/${encodeURIComponent(slug)}/html`;
  return `/api/demo-hub/files/${encodeURIComponent(slug)}/pdf/${index}`;
}

function withPublicUrls(entry) {
  const slug = entry.id;
  const localPdfs = Array.isArray(entry.sourcePdfs) ? entry.sourcePdfs.filter(Boolean) : [];
  const pdfs = localPdfs.length
    ? localPdfs.map((rel, index) => ({
      name: path.basename(rel),
      url: rel,
      index,
    }))
    : (entry.pdfs || []).map((pdf, index) => ({
      name: pdf.name || `document-${index + 1}.pdf`,
      url: publicFileUrl(slug, 'pdf', index),
      index,
    }));

  const localHtml = entry.formHtml || entry.formHtmlOneAtATime;
  return {
    ...entry,
    sourcePdf: pdfs[0]?.url || entry.sourcePdf || null,
    sourcePdfs: pdfs.map((pdf) => pdf.url),
    pdfs,
    formHtml: localHtml || (entry.htmlPath ? publicFileUrl(slug, 'html') : entry.formHtml),
  };
}

async function uploadToStorage(storagePath, buffer, contentType) {
  const file = storageBucket().file(storagePath);
  await file.save(buffer, {
    resumable: false,
    metadata: {
      contentType,
      cacheControl: 'private, max-age=0',
    },
  });
  return storagePath;
}

async function saveEntryToFirebase(slug, entry, { pdfFiles, html }) {
  const pdfs = [];
  for (let i = 0; i < pdfFiles.length; i += 1) {
    const file = pdfFiles[i];
    const fileName = safeFileName(file.name, `document-${i + 1}.pdf`);
    const storagePath = `${STORAGE_PREFIX}/${slug}/pdfs/${String(i).padStart(2, '0')}-${fileName}`;
    await uploadToStorage(storagePath, file.data, 'application/pdf');
    pdfs.push({ name: fileName, storagePath, index: i });
  }

  const htmlPath = `${STORAGE_PREFIX}/${slug}/form.html`;
  await uploadToStorage(htmlPath, Buffer.from(html, 'utf8'), 'text/html; charset=utf-8');

  const record = {
    id: slug,
    title: entry.title,
    description: entry.description || '',
    sections: entry.sections || 0,
    questions: entry.questions || 0,
    approvedAt: entry.approvedAt,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    pdfs,
    htmlPath,
    storedInFirebase: true,
  };

  await firestoreDb().collection(FIRESTORE_COLLECTION).doc(slug).set(record, { merge: true });
  return record;
}

async function deleteFromFirebase(slug) {
  try {
    await firestoreDb().collection(FIRESTORE_COLLECTION).doc(slug).delete();
  } catch (error) {
    console.warn('[demo-hub] Firestore delete:', error.message);
  }
  try {
    await storageBucket().deleteFiles({ prefix: `${STORAGE_PREFIX}/${slug}/` });
  } catch (error) {
    console.warn('[demo-hub] Storage delete:', error.message);
  }
}

async function listFirebaseEntries() {
  const snap = await firestoreDb().collection(FIRESTORE_COLLECTION).get();
  return snap.docs.map((doc) => {
    const data = doc.data() || {};
    return {
      id: doc.id,
      title: data.title || doc.id,
      description: data.description || '',
      sections: data.sections || 0,
      questions: data.questions || 0,
      approvedAt: data.approvedAt || '',
      pdfs: data.pdfs || [],
      htmlPath: data.htmlPath || null,
      storedInFirebase: true,
      formHtml: null,
      formHtmlOneAtATime: null,
      sourcePdf: null,
      sourcePdfs: [],
      fieldMap: null,
      formConfig: null,
    };
  });
}

async function existingIds() {
  const ids = new Set((readManifest().forms || []).map((form) => form.id));
  try {
    const fb = await listFirebaseEntries();
    fb.forEach((form) => ids.add(form.id));
  } catch (error) {
    console.warn('[demo-hub] Could not list Firebase ids:', error.message);
  }
  return ids;
}

function collectPdfUploads(files) {
  const fromSet = getUploadedFiles(files, 'pdfs');
  if (fromSet.length) return fromSet;
  const single = getUploadedFile(files, 'pdf');
  return single ? [single] : [];
}

function htmlFromRequest(req) {
  const htmlFile = getUploadedFile(req.files, 'htmlFile');
  if (htmlFile?.data) return htmlFile.data.toString('utf8');
  const pasted = String(req.body?.html || '').trim();
  if (pasted) return pasted;
  const htmlAll = getUploadedFile(req.files, 'htmlAll');
  const htmlOne = getUploadedFile(req.files, 'htmlOne');
  if (htmlAll?.data) return htmlAll.data.toString('utf8');
  if (htmlOne?.data) return htmlOne.data.toString('utf8');
  return '';
}

async function writeLocalFiles(slug, { pdfFiles, html, htmlOneFile }) {
  const dir = formDir(slug);
  fs.mkdirSync(dir, { recursive: true });
  const pdfDir = path.join(dir, 'pdfs');
  fs.mkdirSync(pdfDir, { recursive: true });

  if (pdfFiles[0]) {
    await saveUpload(pdfFiles[0], path.join(dir, 'source.pdf'));
  }
  for (let i = 0; i < pdfFiles.length; i += 1) {
    const fileName = `${String(i).padStart(2, '0')}-${safeFileName(pdfFiles[i].name, `document-${i + 1}.pdf`)}`;
    await saveUpload(pdfFiles[i], path.join(pdfDir, fileName));
  }

  if (html) {
    fs.writeFileSync(path.join(dir, 'form-all-at-once.html'), html, 'utf8');
  }
  if (htmlOneFile) {
    await saveUpload(htmlOneFile, path.join(dir, 'form-one-at-a-time.html'));
  }
}

async function handleCreateEntry(req, res) {
  try {
    const pdfFiles = collectPdfUploads(req.files);
    const html = htmlFromRequest(req);
    const htmlAllFile = getUploadedFile(req.files, 'htmlAll');
    const htmlOneFile = getUploadedFile(req.files, 'htmlOne');

    if (!pdfFiles.length) {
      return res.status(400).json({ success: false, error: 'Upload at least one PDF.' });
    }
    if (!html && !htmlAllFile && !htmlOneFile) {
      return res.status(400).json({ success: false, error: 'Paste or upload the HTML form.' });
    }

    pdfFiles.forEach((file) => assertExtension(file, ['.pdf'], 'PDF'));
    if (htmlAllFile) assertExtension(htmlAllFile, ['.html', '.htm'], 'HTML');
    if (htmlOneFile) assertExtension(htmlOneFile, ['.html', '.htm'], 'HTML');

    const htmlText = html || (htmlAllFile ? htmlAllFile.data.toString('utf8') : '');
    const firstPdfName = String(pdfFiles[0].name || '').replace(/\.pdf$/i, '');
    const title = String(req.body?.title || '').trim()
      || titleFromHtml(htmlText)
      || firstPdfName
      || 'Untitled entry';
    const description = String(req.body?.description || '').trim();
    const stats = countFormStats(htmlText);

    const ids = await existingIds();
    const slug = uniqueSlug(req.body?.id || title, ids);

    await writeLocalFiles(slug, {
      pdfFiles,
      html: htmlText,
      htmlOneFile,
    });

    const approvedAt = new Date().toISOString().slice(0, 10);
    const entry = entryFromDisk(slug, title, description, {
      approvedAt,
      sections: stats.sections,
      questions: stats.questions,
      storedInFirebase: true,
    });

    const manifest = readManifest();
    manifest.forms = Array.isArray(manifest.forms) ? manifest.forms : [];
    manifest.forms.push(entry);
    writeManifest(manifest);

    try {
      await saveEntryToFirebase(slug, entry, { pdfFiles, html: htmlText });
    } catch (error) {
      console.error('[demo-hub/create] Firebase save failed:', error);
      rmDirRecursive(formDir(slug));
      manifest.forms = manifest.forms.filter((form) => form.id !== slug);
      writeManifest(manifest);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to save entry to Firebase.',
      });
    }

    res.json({ success: true, entry: withPublicUrls(entry), manifest });
  } catch (error) {
    console.error('[demo-hub/create]', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to create hub entry' });
  }
}

async function handleUpdateEntry(req, res) {
  try {
    const slug = String(req.params.slug || '').replace(/[^a-zA-Z0-9_-]/g, '');
    if (!slug) {
      return res.status(400).json({ success: false, error: 'Form id is required' });
    }

    const manifest = readManifest();
    let idx = (manifest.forms || []).findIndex((form) => form.id === slug);
    if (idx < 0) {
      manifest.forms = Array.isArray(manifest.forms) ? manifest.forms : [];
      manifest.forms.push({ id: slug, title: slug });
      idx = manifest.forms.length - 1;
    }

    const dir = formDir(slug);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const prev = manifest.forms[idx];
    const pdfFiles = collectPdfUploads(req.files);
    const html = htmlFromRequest(req);
    const htmlAll = getUploadedFile(req.files, 'htmlAll');
    const htmlOne = getUploadedFile(req.files, 'htmlOne');

    if (pdfFiles.length) {
      pdfFiles.forEach((file) => assertExtension(file, ['.pdf'], 'PDF'));
      await writeLocalFiles(slug, { pdfFiles, html: null, htmlOneFile: null });
    }
    if (html) {
      fs.writeFileSync(path.join(dir, 'form-all-at-once.html'), html, 'utf8');
    }
    if (htmlAll) {
      assertExtension(htmlAll, ['.html', '.htm'], 'HTML');
      await saveUpload(htmlAll, path.join(dir, 'form-all-at-once.html'));
    }
    if (htmlOne) {
      assertExtension(htmlOne, ['.html', '.htm'], 'HTML');
      await saveUpload(htmlOne, path.join(dir, 'form-one-at-a-time.html'));
    }

    const htmlPath = path.join(dir, 'form-all-at-once.html');
    const htmlText = html || (fs.existsSync(htmlPath) ? fs.readFileSync(htmlPath, 'utf8') : '');
    const title = req.body?.title != null && String(req.body.title).trim()
      ? String(req.body.title).trim()
      : (prev.title || titleFromHtml(htmlText) || slug);
    const description = req.body?.description != null
      ? String(req.body.description).trim()
      : prev.description;

    const stats = htmlText ? countFormStats(htmlText) : {
      sections: prev.sections || 0,
      questions: prev.questions || 0,
    };
    const entry = entryFromDisk(slug, title, description, {
      ...prev,
      sections: stats.sections,
      questions: stats.questions,
      storedInFirebase: true,
    });

    if (!entry.formHtml && !entry.formHtmlOneAtATime) {
      return res.status(400).json({
        success: false,
        error: 'Entry must keep HTML content',
      });
    }
    if (!entry.sourcePdf && !(entry.sourcePdfs || []).length) {
      return res.status(400).json({ success: false, error: 'Entry must keep at least one PDF' });
    }

    manifest.forms[idx] = entry;
    writeManifest(manifest);

    const pdfsForFirebase = pdfFiles.length ? pdfFiles : [];
    if (pdfsForFirebase.length || htmlText) {
      const localPdfBuffers = pdfsForFirebase.length
        ? pdfsForFirebase
        : listLocalPdfs(slug).map((rel, index) => ({
          name: path.basename(rel),
          data: fs.readFileSync(path.join(HUB_DIR, rel)),
        }));
      try {
        await saveEntryToFirebase(slug, entry, {
          pdfFiles: localPdfBuffers,
          html: htmlText,
        });
      } catch (error) {
        console.error('[demo-hub/update] Firebase save failed:', error);
        return res.status(500).json({
          success: false,
          error: error.message || 'Updated locally but failed to save to Firebase.',
        });
      }
    }

    res.json({ success: true, entry: withPublicUrls(entry), manifest });
  } catch (error) {
    console.error('[demo-hub/update]', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to update hub entry' });
  }
}

async function handleDeleteEntry(req, res) {
  try {
    const slug = String(req.params.slug || '').replace(/[^a-zA-Z0-9_-]/g, '');
    if (!slug) {
      return res.status(400).json({ success: false, error: 'Form id is required' });
    }

    const manifest = readManifest();
    const before = (manifest.forms || []).length;
    manifest.forms = (manifest.forms || []).filter((form) => form.id !== slug);
    const removedLocal = manifest.forms.length !== before;
    if (removedLocal) writeManifest(manifest);
    rmDirRecursive(formDir(slug));
    await deleteFromFirebase(slug);

    if (!removedLocal) {
      const remaining = await listFirebaseEntries();
      if (!remaining.some((form) => form.id === slug) && !removedLocal) {
        // Deleted from Firebase even if it was never in the local manifest.
      }
    }

    res.json({ success: true, manifest });
  } catch (error) {
    console.error('[demo-hub/delete]', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to delete hub entry' });
  }
}

async function handleListEntries(req, res) {
  try {
    const manifest = readManifest();
    const local = (manifest.forms || []).map((form) => withPublicUrls(entryFromDisk(
      form.id,
      form.title,
      form.description,
      form
    )));
    let remote = [];
    try {
      remote = await listFirebaseEntries();
    } catch (error) {
      console.warn('[demo-hub/list] Firebase:', error.message);
    }

    const byId = new Map();
    remote.forEach((form) => byId.set(form.id, withPublicUrls(form)));
    local.forEach((form) => {
      const existing = byId.get(form.id) || {};
      byId.set(form.id, withPublicUrls({ ...existing, ...form }));
    });

    res.json({
      success: true,
      entries: [...byId.values()],
      manifest,
    });
  } catch (error) {
    console.error('[demo-hub/list]', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to list hub entries' });
  }
}

function sendLocalOrStorage(res, localPath, storagePath, contentType) {
  if (localPath && fs.existsSync(localPath)) {
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'no-store');
    return res.sendFile(localPath);
  }
  if (!storagePath) {
    return res.status(404).json({ success: false, error: 'File not found' });
  }
  const stream = storageBucket().file(storagePath).createReadStream();
  res.setHeader('Content-Type', contentType);
  res.setHeader('Cache-Control', 'no-store');
  stream.on('error', (error) => {
    console.error('[demo-hub/file]', error);
    if (!res.headersSent) {
      res.status(404).json({ success: false, error: 'File not found in Firebase Storage' });
    }
  });
  stream.pipe(res);
}

async function handleGetEntryHtml(req, res) {
  try {
    const slug = String(req.params.slug || '').replace(/[^a-zA-Z0-9_-]/g, '');
    const dir = formDir(slug);
    const localAll = path.join(dir, 'form-all-at-once.html');
    const localOne = path.join(dir, 'form-one-at-a-time.html');
    const localPath = fs.existsSync(localAll) ? localAll : (fs.existsSync(localOne) ? localOne : null);
    return sendLocalOrStorage(res, localPath, `${STORAGE_PREFIX}/${slug}/form.html`, 'text/html; charset=utf-8');
  } catch (error) {
    console.error('[demo-hub/html]', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to load HTML' });
  }
}

async function handleGetEntryPdf(req, res) {
  try {
    const slug = String(req.params.slug || '').replace(/[^a-zA-Z0-9_-]/g, '');
    const index = Math.max(0, parseInt(req.params.index, 10) || 0);
    const pdfs = listLocalPdfs(slug);
    const localRel = pdfs[index];
    const localPath = localRel ? path.join(HUB_DIR, localRel) : null;

    let storagePath = null;
    try {
      const doc = await firestoreDb().collection(FIRESTORE_COLLECTION).doc(slug).get();
      const stored = doc.exists ? (doc.data().pdfs || [])[index] : null;
      storagePath = stored?.storagePath || `${STORAGE_PREFIX}/${slug}/pdfs/`;
    } catch (_) {
      storagePath = null;
    }

    if (!localPath && storagePath && storagePath.endsWith('/')) {
      const [files] = await storageBucket().getFiles({ prefix: storagePath });
      const pdfFiles = files.filter((file) => file.name.toLowerCase().endsWith('.pdf')).sort((a, b) => a.name.localeCompare(b.name));
      const chosen = pdfFiles[index];
      if (!chosen) {
        return res.status(404).json({ success: false, error: 'PDF not found' });
      }
      return sendLocalOrStorage(res, null, chosen.name, 'application/pdf');
    }

    return sendLocalOrStorage(res, localPath, storagePath, 'application/pdf');
  } catch (error) {
    console.error('[demo-hub/pdf]', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to load PDF' });
  }
}

module.exports = {
  handleCreateEntry,
  handleUpdateEntry,
  handleDeleteEntry,
  handleListEntries,
  handleGetEntryHtml,
  handleGetEntryPdf,
  readManifest,
};
