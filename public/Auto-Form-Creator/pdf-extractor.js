/**
 * PDF form field extractor — shared logic from pdfextractor.html
 */
(function (global) {
    'use strict';

    const LINE_THRESHOLD = 10;
    const WORD_SPACING_THRESHOLD = 1;

    function ensurePdfWorker() {
        if (global.pdfjsLib && !global.pdfjsLib.GlobalWorkerOptions.workerSrc) {
            global.pdfjsLib.GlobalWorkerOptions.workerSrc =
                'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }
    }

    function isFillableCheckboxField(annotation) {
        // PDF Btn fields include checkboxes, radio buttons, and push buttons (Print/Reset).
        // pdf.js sets these from the field /Ff flags — do not guess from the field name.
        return annotation.fieldType === 'Btn' && annotation.checkBox === true;
    }

    function isExtractableFormField(annotation) {
        return annotation.fieldType === 'Tx' || isFillableCheckboxField(annotation);
    }

    /**
     * Extract form fields and document layout from a PDF ArrayBuffer.
     * @returns {Promise<{fullContentHtml: string, textFields: Array, checkboxFields: Array}>}
     */
    async function extractPdfFormFields(arrayBuffer) {
        ensurePdfWorker();

        const originalPdfBytes = new Uint8Array(arrayBuffer);
        const pdf = await global.pdfjsLib.getDocument({ data: originalPdfBytes }).promise;

        const textFields = [];
        const checkboxFields = [];
        const allPagesContent = [];

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();
            const annotations = await page.getAnnotations();

            const textItems = textContent.items.map(item => ({
                type: 'text',
                text: item.str,
                xStart: item.transform[4],
                xEnd: item.transform[4] + (item.str.length * 0.6 * Math.abs(item.transform[0])),
                y: item.transform[5]
            }));

            textItems.sort((a, b) => b.y - a.y || a.xStart - b.xStart);

            const lines = [];
            let currentLine = { y: null, items: [] };

            textItems.forEach(ti => {
                if (!currentLine.y || Math.abs(currentLine.y - ti.y) < LINE_THRESHOLD) {
                    currentLine.items.push(ti);
                    currentLine.y = currentLine.y || ti.y;
                } else {
                    lines.push(currentLine);
                    currentLine = { y: ti.y, items: [ti] };
                }
            });
            if (currentLine.items.length) lines.push(currentLine);

            const pageFields = annotations
                .filter(isExtractableFormField)
                .map(a => ({
                    name: a.fieldName || 'Unnamed Field',
                    type: 'field',
                    fieldType: a.fieldType,
                    isCheckbox: isFillableCheckboxField(a),
                    xStart: (a.rect[0] + a.rect[2]) / 2,
                    xEnd: (a.rect[0] + a.rect[2]) / 2,
                    centerY: (a.rect[1] + a.rect[3]) / 2
                }));

            pageFields.sort((a, b) => b.centerY - a.centerY);

            pageFields.forEach(field => {
                const closestLine = lines.reduce((closest, ln) =>
                    Math.abs(ln.y - field.centerY) < Math.abs(closest.y - field.centerY) ? ln : closest
                );

                field.text = field.isCheckbox ? `{{${field.name}}}` : `[[${field.name}]]`;

                if (field.isCheckbox) {
                    checkboxFields.push({ name: field.name, marker: field.text });
                } else {
                    textFields.push({ name: field.name, marker: field.text });
                }

                closestLine.items.push(field);
            });

            const pageContent = lines.map(ln => {
                ln.items.sort((a, b) => a.xStart - b.xStart);
                const lineParts = [];

                ln.items.forEach((item, i) => {
                    if (item.type === 'field') {
                        const className = item.isCheckbox ? 'checkbox-highlight' : 'field-highlight';
                        lineParts.push(
                            `<span class="${className}">${item.text}</span>`
                        );
                    } else {
                        const prev = ln.items[i - 1];
                        const gap = prev ? item.xStart - prev.xEnd : 0;
                        lineParts.push((gap > WORD_SPACING_THRESHOLD ? ' ' : '') + item.text);
                    }
                });

                return `<div class="text-line">${lineParts.join('')}</div>`;
            }).join('');

            allPagesContent.push(pageContent);
        }

        return {
            fullContentHtml: allPagesContent.join('<div class="page-break"></div>'),
            textFields,
            checkboxFields
        };
    }

    global.PdfFieldExtractor = { extract: extractPdfFormFields };
})(typeof window !== 'undefined' ? window : globalThis);
