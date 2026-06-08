import React, { useEffect, useRef, useState, useCallback } from 'react';
import api from '../api/axios';

/**
 * LetterEditorModal - Full-screen Word-like letter editor
 *
 * Props:
 *   show: boolean
 *   onHide: fn
 *   requestId: number/string
 *   requestData: object (request details)
 */
export default function LetterEditorModal({ show, onHide, requestId, requestData }) {
  const quillRef = useRef(null);
  const editorRef = useRef(null);
  const [quillInstance, setQuillInstance] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Initialize Quill once modal is shown
  useEffect(() => {
    if (!show) return;

    let isMounted = true;

    const initQuill = async () => {
      if (!editorRef.current) return;

      const { default: Quill } = await import('quill');
      await import('quill/dist/quill.snow.css');

      if (!isMounted || !editorRef.current) return;

      // Destroy old instance if any
      if (quillRef.current) {
        quillRef.current = null;
      }
      editorRef.current.innerHTML = '';

      const qInstance = new Quill(editorRef.current, {
        theme: 'snow',
        modules: {
          toolbar: '#ql-toolbar-container',
        },
      });

      quillRef.current = qInstance;
      if (isMounted) setQuillInstance(qInstance);

      // Load content
      setLoading(true);
      try {
        let content = '';
        if (requestData?.letter_content) {
          content = requestData.letter_content;
        } else {
          const res = await api.get(`/letters/${requestId}/generate`, {
            responseType: 'text',
          });
          // Backend returns raw HTML string
          content = typeof res.data === 'string' ? res.data : (res.data?.content || res.data?.html || '');
        }
        if (content) {
          qInstance.clipboard.dangerouslyPasteHTML(content);
        }
      } catch {
        // Try to load saved content or start blank
        if (requestData?.letter_content) {
          qInstance.clipboard.dangerouslyPasteHTML(requestData.letter_content);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    // Small delay to let modal render
    const timer = setTimeout(initQuill, 200);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [show, requestId]);

  // Cleanup on hide
  useEffect(() => {
    if (!show) {
      setQuillInstance(null);
      quillRef.current = null;
      setSaveMsg('');
      setSaving(false);
    }
  }, [show]);

  const getEditorHtml = useCallback(() => {
    if (quillRef.current) {
      return quillRef.current.root.innerHTML;
    }
    return '';
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg('');
    try {
      const html = getEditorHtml();
      await api.put(`/requests/${requestId}/letter`, { letter_content: html });
      setSaveMsg('Saved successfully!');
      setTimeout(() => setSaveMsg(''), 3000);
    } catch {
      setSaveMsg('Save failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = async () => {
    // Prefer fetching the full styled letter from backend for correct print layout
    try {
      const res = await api.get(`/letters/${requestId}/generate`, { responseType: 'text' });
      const fullHtml = typeof res.data === 'string' ? res.data : '';
      if (fullHtml) {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(fullHtml);
        printWindow.document.close();
        printWindow.onload = () => { printWindow.print(); };
        return;
      }
    } catch { /* fallback below */ }

    // Fallback: print editor content with basic styles
    const html = getEditorHtml();
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Letter - ${requestData?.request_no || requestId}</title>
          <style>
            @page { size: A4; margin: 0; }
            body { margin: 0; padding: 0; background: #fff; font-family: "Times New Roman", Times, serif; font-size: 18px; }
            .print-area { padding: 2.5in 1in 1.2in 1in; min-height: 11.69in; box-sizing: border-box; }
          </style>
        </head>
        <body>
          <div class="print-area">${html}</div>
          <script>window.onload = function() { window.print(); window.close(); }<\/script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownloadDocx = () => {
    try {
      const html = getEditorHtml();
      // Create a Word-compatible HTML document (opens in Word as editable .doc)
      const wordHtml = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office"
              xmlns:w="urn:schemas-microsoft-com:office:word"
              xmlns="http://www.w3.org/TR/REC-html40">
          <head>
            <meta charset="utf-8" />
            <title>Letter - ${requestData?.request_no || requestId}</title>
            <!--[if gte mso 9]>
            <xml><w:WordDocument><w:View>Print</w:View><w:Zoom>90</w:Zoom></w:WordDocument></xml>
            <![endif]-->
            <style>
              @page { size: 21cm 29.7cm; margin: 2.5cm 2cm 2.5cm 2.5cm; }
              body { font-family: "Times New Roman", Times, serif; font-size: 12pt; line-height: 1.6; color: #000; }
              p { margin: 0 0 6pt; }
              ol, ul { margin: 8pt 0 8pt 20pt; }
              li { margin-bottom: 4pt; }
            </style>
          </head>
          <body>${html}</body>
        </html>`;

      const blob = new Blob([wordHtml], {
        type: 'application/vnd.ms-word;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Letter_${requestData?.request_no || requestId}.doc`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to download Word document. ' + (err.message || ''));
    }
  };

  const handleDownloadPdf = async () => {
    try {
      const res = await api.get(`/letters/${requestId}/pdf`, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `Letter_${requestData?.request_no || requestId}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Failed to download PDF. Please try again.');
    }
  };

  if (!show) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        zIndex: 1060,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Modal container - full height */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          background: '#f3f2f1',
        }}
      >
        {/* Header bar (Word title bar style) */}
        <div
          style={{
            background: 'var(--vni-primary)',
            color: '#fff',
            padding: '0.5rem 1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-envelope-paper-fill text-warning" />
            <span className="fw-semibold">
              Letter Editor — {requestData?.request_no || `Request #${requestId}`}
            </span>
            {requestData?.professor?.name && (
              <span className="text-white-50 small">
                — {requestData.professor.name}
              </span>
            )}
          </div>
          <button
            type="button"
            className="btn-close btn-close-white"
            onClick={onHide}
          />
        </div>

        {/* Action ribbon */}
        <div
          style={{
            background: '#fff',
            borderBottom: '1px solid #d4d4d4',
            padding: '0.4rem 1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            flexWrap: 'wrap',
            flexShrink: 0,
          }}
        >
          <button
            className="btn btn-sm btn-primary d-flex align-items-center gap-1"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <span className="spinner-border spinner-border-sm" />
            ) : (
              <i className="bi bi-floppy" />
            )}
            Save
          </button>
          <button
            className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
            onClick={handlePrint}
          >
            <i className="bi bi-printer" />
            Print
          </button>
          <button
            className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
            onClick={handleDownloadDocx}
          >
            <i className="bi bi-file-earmark-word" />
            Download .docx
          </button>
          <button
            className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
            onClick={handleDownloadPdf}
          >
            <i className="bi bi-file-earmark-pdf" />
            Download PDF
          </button>

          <div className="vni-toolbar-divider" style={{ width: 1, height: 24, background: '#d4d4d4', margin: '0 0.25rem' }} />

          {/* Quill toolbar will be injected here */}
          <div id="ql-toolbar-container" style={{ border: 'none', padding: 0 }}>
            <span className="ql-formats">
              <select className="ql-size" defaultValue="">
                <option value="small">Small</option>
                <option value="">Normal</option>
                <option value="large">Large</option>
                <option value="huge">Huge</option>
              </select>
            </span>
            <span className="ql-formats">
              <button className="ql-bold" />
              <button className="ql-italic" />
              <button className="ql-underline" />
            </span>
            <span className="ql-formats">
              <button className="ql-align" value="" />
              <button className="ql-align" value="center" />
              <button className="ql-align" value="right" />
              <button className="ql-align" value="justify" />
            </span>
            <span className="ql-formats">
              <button className="ql-list" value="ordered" />
              <button className="ql-list" value="bullet" />
            </span>
            <span className="ql-formats">
              <button className="ql-clean" />
            </span>
          </div>

          {saveMsg && (
            <span
              className={`ms-auto small ${saveMsg.includes('failed') ? 'text-danger' : 'text-success'}`}
            >
              <i className={`bi ${saveMsg.includes('failed') ? 'bi-x-circle' : 'bi-check-circle'} me-1`} />
              {saveMsg}
            </span>
          )}
        </div>

        {/* Editor area - scrollable */}
        <div
          className="letter-editor-wrapper flex-grow-1 overflow-auto letter-print-area"
          style={{ background: '#e0e0e0', padding: '1.5rem' }}
        >
          {loading && (
            <div className="text-center py-5">
              <div className="spinner-border" style={{ color: 'var(--vni-primary)' }} />
              <p className="mt-3 text-muted">Generating letter...</p>
            </div>
          )}
          <div className="letter-a4-paper" style={{ display: loading ? 'none' : undefined }}>
            <div ref={editorRef} style={{ minHeight: '250mm' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
